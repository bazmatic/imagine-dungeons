import OpenAI from "openai";
import {
    ChatCompletionMessageParam,
    ChatCompletionMessageToolCall,
    ChatCompletionTool
} from "openai/resources/chat/completions";

import { AiTool, AiToolCall } from "@/types/types";
import { GameEvent } from "@/entity/GameEvent";
import { getAvailableTools } from "../Referee";
import {
    getLocationContext,
    describeRecentEvents,
    interpretAgentInstructionsSystemPrompt,
    consequentEventsSystemPrompt,
    agentMakesInstructionsSystemPrompt
} from "../Prompts";

import { COMMAND_TYPE } from "@/types/commands";
import { Agent } from "@/entity/Agent";
import { IAiHelper } from "./Ai";

const SEED = 100;
const OPEN_AI_STRUCTURED_OUTPUT_MODEL = "gpt-4o-mini"; //"gpt-4o-2024-08-06";
const OPEN_AI_TEXT_OUTPUT_MODEL = "gpt-4o-mini";

export class OpenAiHelper implements IAiHelper {
    private openai: OpenAI;

    constructor() {
        this.openai = new OpenAI();
    }

    private openAiToolCallToAiToolCall(
        toolCall: ChatCompletionMessageToolCall
    ): AiToolCall {
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
    public async interpretAgentInstructions(
        instructions: string,
        actingAgent: Agent
    ): Promise<AiToolCall[]> {
        const recentEventsMessage = await describeRecentEvents(
            actingAgent.agentId
        );
        const locationId = (await actingAgent.location).locationId;
        const context = await getLocationContext(locationId, actingAgent);
        const locationIdList = [context.location.id];
        const agentIdList = [actingAgent.agentId];
        const itemIdList = context.items_present.map(item => item.id);
        const exitIdList = context.exits.map(exit => exit.id);
        const creatureTemplateIdList: string[] = context.location.creatureTemplates?.map(creatureTemplate => creatureTemplate.templateId) ?? [];
        const tools = getAvailableTools(actingAgent,
            locationIdList,
            agentIdList,
            itemIdList,
            exitIdList,
            creatureTemplateIdList
        );
        const systemPrompt = interpretAgentInstructionsSystemPrompt(tools.map(tool => tool.name));

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            { role: "system", content: recentEventsMessage },
            {
                role: "system",
                content: `Here is what the agent can see: ${JSON.stringify(
                    context,
                    null,
                    4
                )}`
            },
            {
                role: "system",
                content: `Here is what the agent said they want to do: ${instructions}`
            },
            {
                role: "user",
                content:
                    "What minimal set of tool calls should be made to accurately carry out the actions that the agent should carry out based on the text description they provided? Respond with a list of tool calls that should be made. If nothing seems to fit well, just use an emote."
            }
        ];
        
        const response = await this.openai.chat.completions.create({
            model: OPEN_AI_STRUCTURED_OUTPUT_MODEL,
            messages,
            tools: tools.map(this.aiToolToOpenAiTool),
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

    public async determineConsequentEvents(
        locationId: string,
        events: GameEvent[]
    ): Promise<AiToolCall[]> {
        const eventDescriptions = (
            await Promise.all(events.map(gameEvent => gameEvent.describe(null)))
        ).filter(e => e !== null);
        const context = await getLocationContext(locationId, null);
        const systemPrompt = consequentEventsSystemPrompt();

        const messages: ChatCompletionMessageParam[] = [
            { role: "system", content: systemPrompt },
            {
                role: "system",
                content: `The following events occurred in this round in this location:\n${eventDescriptions
                    .map(
                        e =>
                            `${e.general_description}: ${e.extra_detail?.join(
                                "\n"
                            )}`
                    )
                    .join("\n\n")}`
            },
            {
                role: "system",
                content: `Here is the current context: ${JSON.stringify(
                    context,
                    null,
                    4
                )}`
            },
            {
                role: "user",
                content:
                    "What tool calls should be made to reflect the events that occurred at this location? Be sure to only unlock exits if an agent specifically performs an action to unlock the exit, and you believe this is the correct action to take. Respond with a list of tool calls that should be made. If no tool calls are necessary, return an empty array or the 'do nothing' tool."
            }
        ];
        const locationIdList = [locationId];
        const agentIdList = [...context.human_agents_present, ...context.autonomous_agents_present].map(agent => agent.id);
        const itemIdList = context.items_present.map(item => item.id);
        const exitIdList = context.exits.map(exit => exit.id);
        const creatureTemplateIdList = context.location.creatureTemplates?.map(creatureTemplate => creatureTemplate.templateId) ?? [];

        const tools = getAvailableTools(null,
            locationIdList,
            agentIdList,
            itemIdList,
            exitIdList,
            creatureTemplateIdList
        );
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
        const recentEventsMessage = await describeRecentEvents(
            actingAgent.agentId
        );
        const systemPrompt = await agentMakesInstructionsSystemPrompt(
            actingAgent
        );
        const messages: ChatCompletionMessageParam[] = [
            //{ role: "system", content: SCENARIO_PROMPT },
            { role: "system", content: systemPrompt },
            { role: "system", content: recentEventsMessage },
            {
                role: "user",
                content:
                    "What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different."
            }
        ];

        const response = await this.openai.chat.completions.create({
            model: OPEN_AI_TEXT_OUTPUT_MODEL,
            messages,
            seed: SEED
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
