import { AiTool, AiToolCall } from "@/types/types";
import { GameEvent } from "@/entity/GameEvent";
import { getAvailableTools } from "../Referee";
import {
    getLocationContext,
    describeRecentEvents,
    interpretAgentInstructionsSystemPrompt,
    consequentEventsSystemPrompt,
    agentMakesInstructionsSystemPrompt,
    AgentPromptContext
} from "../Prompts";

import { COMMAND_TYPE } from "@/types/commands";
import { Agent } from "@/entity/Agent";
import { IAiHelper } from "./Ai";
enum AVAILABLE_MODELS {
    NONE = "none",
    QWEN2_5 = "qwen2.5",
    LLAMA3_1 = "llama3.1",
    LLAMA3_2 = "llama3.2",
    LLAMA3_GROQ_TOOL_USE = "llama3-groq-tool-use",
}

const OLLAMA_MODEL = AVAILABLE_MODELS.NONE; 
export class OllamaAiHelper implements IAiHelper {
    // Turn off lint error for implcit any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private async ollamaRequest(messages: any[], tools: any[]): Promise<any> {
        //console.log("systemPrompt", systemPrompt);

        try {
            const body = {
                model: OLLAMA_MODEL,
                messages: messages,
                stream: false,
                //system: systemPrompt,
                tools: tools,
            }
            console.log("========================");
            console.log("body", JSON.stringify(body, null, 4));
            console.log("========================");
            const response = await fetch("http://127.0.0.1:11434/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body),
            });
    
            if (!response.ok) {
                throw new Error(`Ollama API request failed: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            console.error("Failed to make request to Ollama:", error);
            return null;
        }
    }

    private aiToolToOllamaTool(tool: AiTool): any {
        return {
            type: "function",
            function: {
                name: tool.name,
                description: tool.description,
                parameters: {
                    type: "object",
                    properties: tool.parameters,
                    required: Object.keys(tool.parameters)
                    //enum: ?? TODO
                },
            },
        };
    }

    private parseToolCalls(toolCalls: any[]): AiToolCall[] {
        return toolCalls.map(call => ({
            name: call.function.name as COMMAND_TYPE,
            arguments: call.function.arguments,
        }));
    }

    public async interpretAgentInstructions(
        instructions: string,
        actingAgent: Agent
    ): Promise<AiToolCall[]> {
        const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
        const locationId = (await actingAgent.location).locationId;
        const context: AgentPromptContext= await getLocationContext(locationId, actingAgent);
        const systemPrompt = interpretAgentInstructionsSystemPrompt();

        // Context in English
        const contextInEnglish = this.contextInEnglish(context);
        const messages = [
            { role: "user", content: systemPrompt },
            { role: "user", content: recentEventsMessage },
            { role: "user", content: contextInEnglish },
            { role: "user", content: `Here is what the agent said they want to do: '${instructions}'. What tool calls best fit the agent's intent?`},
        ];

        const locationIdList = [context.location.id];
        const agentIdList = [actingAgent.agentId, ...context.human_agents_present.map(agent => agent.id), ...context.autonomous_agents_present.map(agent => agent.id)];
        const itemIdList = context.items_present.map(item => item.id);
        const exitIdList = context.exits.map(exit => exit.id);
        const creatureTemplateIdList = context.location.creatureTemplates?.map(creatureTemplate => creatureTemplate.templateId) ?? [];

        const availableTools = getAvailableTools(actingAgent,
            locationIdList,
            agentIdList,
            itemIdList,
            exitIdList,
            creatureTemplateIdList
        );
        const tools = availableTools.map(this.aiToolToOllamaTool);

        const response = await this.ollamaRequest(messages, tools);
        if (!response) {
            console.warn("No response from Ollama");
            return [];
        }
        console.log("========================");
        console.log("response", JSON.stringify(response.message, null, 4));
        console.log("========================");

        if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
            console.warn("No tool calls returned from Ollama");
            return [];
        }

        const result = this.parseToolCalls(response.message.tool_calls);
        //Output to console
        for (const toolCall of result) {
            console.log(`Tool call: ${toolCall.name} with arguments: ${JSON.stringify(toolCall.arguments, null, 4)}`);
        }
        return result;
    }

    public contextInEnglish(context: AgentPromptContext): string {
        const result: string[] = [];
        result.push(`Current location: ${context.location.longDescription}`);
        result.push(`Here is a list of the items in the current location, along with their IDs:`);
        for (const item of context.items_present) {
            result.push(`ID: ${item.id} Name: ${item.label}`);
        }
        result.push(`Here is a list of the agents in the current location:`);
        for (const agent of context.human_agents_present) {
            result.push(`ID: ${agent.id} Name: ${agent.label}`);
        }
        for (const agent of context.autonomous_agents_present) {
            result.push(`ID: ${agent.id} Name: ${agent.label}`);
        }
        result.push(`Here is a list of the exits in the current location:`);
        for (const exit of context.exits) {
            result.push(`ID: ${exit.id} Name: ${exit.shortDescription}`);
        }

        return result.join("\n");
    }

    public async determineConsequentEvents(
        locationId: string,
        events: GameEvent[]
    ): Promise<AiToolCall[]> {
        const eventDescriptions = (await Promise.all(events.map(gameEvent => gameEvent.describe(null)))).filter(e => e !== null);
        const context = await getLocationContext(locationId, null);
        const systemPrompt = consequentEventsSystemPrompt();

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "system", content: `The following events occurred in this round in this location:\n${eventDescriptions.map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`).join("\n\n")}` },
            { role: "system", content: `Here is the current context: ${JSON.stringify(context, null, 4)}` },
            { role: "user", content: "What tool calls should be made to reflect the events that occurred at this location? Be sure to only unlock exits if an agent specifically performs an action to unlock the exit, and you believe this is the correct action to take." },
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
        ).map(this.aiToolToOllamaTool);

        const response = await this.ollamaRequest(messages, tools);

        if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
            console.warn("No tool calls returned from Ollama");
            return [];
        }

        return this.parseToolCalls(response.message.tool_calls);
    }

    public async agentMakesInstructions(actingAgent: Agent): Promise<string> {
        const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
        const systemPrompt = await agentMakesInstructionsSystemPrompt(actingAgent);

        const messages = [
            { role: "system", content: systemPrompt },
            { role: "system", content: recentEventsMessage },
            { role: "user", content: "What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different." },
        ];

        const response = await this.ollamaRequest(messages, []);

        return response.message.content;
    }
}
