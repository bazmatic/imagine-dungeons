import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionTool } from "openai/resources/chat/completions";
import Anthropic from '@anthropic-ai/sdk';

import { AiTool, AiToolCall } from "@/types/types";
import { GameEvent } from "@/entity/GameEvent";
import { getAvailableTools } from "./Referee";
import { getLocationContext, describeRecentEvents, interpretAgentInstructionsSystemPrompt, consequentEventsSystemPrompt, agentMakesInstructionsSystemPrompt } from "./Prompts";

import { COMMAND_TYPE, Tools } from "@/types/commands";
import { Agent } from "@/entity/Agent";
import { ContentBlock, ToolUseBlock } from "@anthropic-ai/sdk/resources";

const SEED = 100;
const OPEN_AI_STRUCTURED_OUTPUT_MODEL = "gpt-4o-2024-08-06";
const OPEN_AI_TEXT_OUTPUT_MODEL = "gpt-4o-mini";
const ANTHROPIC_STRUCTURED_OUTPUT_MODEL = "claude-3-sonnet-20240229";
const ANTHROPIC_TEXT_OUTPUT_MODEL = "claude-3-haiku-20240307";

export interface IAiHelper {
    interpretAgentInstructions(instructions: string, actingAgent: Agent): Promise<AiToolCall[]>;
    determineConsequentEvents(locationId: string, events: GameEvent[]): Promise<AiToolCall[]>;
    agentMakesInstructions(actingAgent: Agent): Promise<string>;
}

export class AnthropicAiHelper implements IAiHelper {
    private anthropic: Anthropic;

    constructor() {
        this.anthropic = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });
    }

    private aiToolToAnthropicTool(tool: AiTool): Anthropic.Tool {
        return {
            name: tool.name,
            description: tool.description,
            input_schema: {
                type: 'object',
                properties: tool.parameters,
                required: Object.keys(tool.parameters),
            },
        };
    }

    private parseToolCalls(toolCalls: ToolUseBlock[]): AiToolCall[] {
        return toolCalls.map(block => {
            try {
                return {
                    name: block.name as COMMAND_TYPE,
                    arguments: block.input
                };
            } catch (error) {
                console.error("Failed to parse tool call:", error);
                return null;
            }
        }).filter((call): call is AiToolCall => call !== null);
    }

    public async interpretAgentInstructions(instructions: string, actingAgent: Agent): Promise<AiToolCall[]> {
        const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
        const locationId = (await actingAgent.location).locationId;
        const context = await getLocationContext(locationId, actingAgent);
        const systemPrompt = interpretAgentInstructionsSystemPrompt();

        const response = await this.anthropic.messages.create({
            model: ANTHROPIC_STRUCTURED_OUTPUT_MODEL,
            max_tokens: 1000,
            system: `${systemPrompt}\n\n${recentEventsMessage}\n\nHere is what the agent can see: ${JSON.stringify(context, null, 4)}\n\nHere is what the agent said they want to do: ${instructions}`,
            messages: [
                { role: "user", content: "What minimal set of tool calls should be made to accurately carry out the actions that the agent should carry out based on the text description they provided? Respond with a list of tool calls that should be made. If nothing seems to fit well, just use an emote." }
            ],
            tools: getAvailableTools(actingAgent).map(this.aiToolToAnthropicTool),
        });

        // Filter, getting just the tool_use blocks
        const toolCalls = response.content.filter((block): block is ToolUseBlock => block.type === "tool_use");

        return this.parseToolCalls(toolCalls);
    }

    public async determineConsequentEvents(locationId: string, events: GameEvent[]): Promise<AiToolCall[]> {
        const eventDescriptions = (await Promise.all(events.map(gameEvent => gameEvent.describe(null)))).filter(e => e !== null);
        const context = await getLocationContext(locationId, null);
        const systemPrompt = consequentEventsSystemPrompt();

        const response = await this.anthropic.messages.create({
            model: ANTHROPIC_STRUCTURED_OUTPUT_MODEL,
            max_tokens: 1000,
            system: `${systemPrompt}\n\n
The following events occurred in this round in this location:
${eventDescriptions.map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`).join("\n\n")}

Here is the current context: ${JSON.stringify(context, null, 4)}`,
            messages: [
                { role: "user", content: "What tool calls should be made to reflect the events that occurred at this location? Be sure to only unlock exits if an agent specifically performs an action to unlock the exit, and you believe this is the correct action to take. Respond with a list of tool calls that should be made. If no tool calls are necessary, return an empty array or the 'do nothing' tool." }
            ],
            tools: getAvailableTools(null).map(this.aiToolToAnthropicTool),
        });

        const toolCalls = response.content.filter((block): block is ToolUseBlock => block.type === "tool_use");
        return this.parseToolCalls(toolCalls);
    }

    public async agentMakesInstructions(actingAgent: Agent): Promise<string> {
        const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
        const systemPrompt = await agentMakesInstructionsSystemPrompt(actingAgent);

        const response = await this.anthropic.messages.create({
            model: ANTHROPIC_TEXT_OUTPUT_MODEL,
            max_tokens: 1000,
            system: `${systemPrompt}\n\n${recentEventsMessage}`,
            messages: [
                { role: "user", content: "What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different." }
            ],
        });

        const instructions = this.mergeContentBlocks(response.content);
        return instructions;
    }
    private mergeContentBlocks(contentBlocks: ContentBlock[]): string {
        return contentBlocks.reduce((acc, block) => {
            if (block.type === 'text') {
                return acc + block.text;
            }
            // Handle other types of content blocks if necessary
            return acc;
        }, '');
    }
}



export class OpenAiHelper implements IAiHelper {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    private openAiToolCallToAiToolCall(toolCall: ChatCompletionMessageToolCall): AiToolCall {
        return {
            name: toolCall.function.name as COMMAND_TYPE,
            arguments: JSON.parse(toolCall.function.arguments)
        };
    }

    private aiToolToOpenAiTool(tool: AiTool): ChatCompletionTool {
        return {
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: "object",
                    properties: tool.parameters,
                    required: Object.keys(tool.parameters),
                    additionalProperties: false
                },
                strict: true
            }
        };
    }
    public async interpretAgentInstructions(instructions: string, actingAgent: Agent): Promise<AiToolCall[]> {
        const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
        const locationId = (await actingAgent.location).locationId;
        const context = await getLocationContext(locationId, actingAgent);
        const systemPrompt = interpretAgentInstructionsSystemPrompt();

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            { role: "system", content: recentEventsMessage },
            { role: "system", content: `Here is what the agent can see: ${JSON.stringify(context, null, 4)}` },
            { role: "system", content: `Here is what the agent said they want to do: ${instructions}` },
            { role: "user", content: "What minimal set of tool calls should be made to accurately carry out the actions that the agent should carry out based on the text description they provided? Respond with a list of tool calls that should be made. If nothing seems to fit well, just use an emote." }
        ];

        const response = await this.openai.chat.completions.create({
            model: OPEN_AI_STRUCTURED_OUTPUT_MODEL,
            messages,
            tools: getAvailableTools(actingAgent).map(this.aiToolToOpenAiTool),
            tool_choice: "required",
            seed: SEED
        });

        const toolCalls = response.choices[0]?.message.tool_calls?.filter(
            call => call.function.name !== "multi_tool_use.parallel"
        );

        if (!toolCalls || toolCalls.length === 0) {
            console.warn(JSON.stringify(response, null, 4));
            return [];
        }

        return toolCalls.map(call => this.openAiToolCallToAiToolCall(call));
    }

    public async determineConsequentEvents(locationId: string, events: GameEvent[]): Promise<AiToolCall[]> {
        const eventDescriptions = (await Promise.all(events.map(gameEvent => gameEvent.describe(null)))).filter(e => e !== null);
        const context = await getLocationContext(locationId, null);
        const systemPrompt = consequentEventsSystemPrompt();

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            { role: "system", content: `The following events occurred in this round in this location:\n${eventDescriptions.map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`).join("\n\n")}` },
            { role: "system", content: `Here is the current context: ${JSON.stringify(context, null, 4)}` },
            { role: "user", content: "What tool calls should be made to reflect the events that occurred at this location? Be sure to only unlock exits if an agent specifically performs an action to unlock the exit, and you believe this is the correct action to take. Respond with a list of tool calls that should be made. If no tool calls are necessary, return an empty array or the 'do nothing' tool." }
        ];

        const tools = getAvailableTools(null);
        const response = await this.openai.chat.completions.create({
            model: OPEN_AI_STRUCTURED_OUTPUT_MODEL,
            messages,
            tools: tools.map(this.aiToolToOpenAiTool),
            tool_choice: "required",
            seed: SEED
        });

        console.log(JSON.stringify(response, null, 4));
        const toolCalls = response.choices[0]?.message.tool_calls?.filter(
            call => call.function.name !== "multi_tool_use.parallel"
        );

        if (!toolCalls || toolCalls.length === 0) {
            return [];
        }

        return toolCalls.map(call => this.openAiToolCallToAiToolCall(call));
    }

    public async agentMakesInstructions(actingAgent: Agent): Promise<string> {
        const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
        const systemPrompt = await agentMakesInstructionsSystemPrompt(actingAgent);
        const messages: ChatCompletionMessageParam[] = [
            //{ role: "system", content: SCENARIO_PROMPT },
            { role: "system", content: systemPrompt },
            { role: "system", content: recentEventsMessage },
            { role: "user", content: "What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different." }
        ];

        const response = await this.openai.chat.completions.create({
            model: OPEN_AI_TEXT_OUTPUT_MODEL,
            messages,
            seed: SEED,
        });

        const choices = response.choices;
        if (!choices || choices.length === 0) {
            throw new Error("No choices from OpenAI");
        }

        const instructions = choices[0].message.content;
        if (!instructions) {
            throw new Error("No instructions found");
        }

        return instructions;
    }
}
