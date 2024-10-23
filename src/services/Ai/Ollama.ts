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

const OLLAMA_MODEL = "llama3.2"; // Using Llama 3.1 for tool support

export class OllamaAiHelper implements IAiHelper {
    private async ollamaRequest(messages: any[], tools: any[], systemPrompt: string): Promise<any> {
        console.log("systemPrompt", systemPrompt);

        try {
            const body = {
                model: OLLAMA_MODEL,
                messages: messages,
                stream: false,
                system: systemPrompt,
                tools: tools,
            }
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
                    required: Object.keys(tool.parameters),
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
        const context = await getLocationContext(locationId, actingAgent);
        const systemPrompt = interpretAgentInstructionsSystemPrompt();
        const systemMessages = `${systemPrompt}\n${recentEventsMessage}\nHere is what the agent can see: ${JSON.stringify(context, null, 4)}\n\nHere is what the agent said they want to do: ${instructions}`

        const messages = [
            { role: "user", content: `Here is what the agent said they want to do: ${instructions}` },
        ];

        const tools = getAvailableTools(actingAgent).map(this.aiToolToOllamaTool);

        const response = await this.ollamaRequest(messages, tools, systemMessages);
        if (!response) {
            console.warn("No response from Ollama");
            return [];
        }

        if (!response.message.tool_calls || response.message.tool_calls.length === 0) {
            console.warn("No tool calls returned from Ollama");
            return [];
        }

        return this.parseToolCalls(response.message.tool_calls);
    }

    public async determineConsequentEvents(
        locationId: string,
        events: GameEvent[]
    ): Promise<AiToolCall[]> {
        const eventDescriptions = (await Promise.all(events.map(gameEvent => gameEvent.describe(null)))).filter(e => e !== null);
        const context = await getLocationContext(locationId, null);
        const systemPrompt = consequentEventsSystemPrompt();

        const messages = [
            { role: "system", content: `The following events occurred in this round in this location:\n${eventDescriptions.map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`).join("\n\n")}` },
            { role: "system", content: `Here is the current context: ${JSON.stringify(context, null, 4)}` },
            { role: "user", content: "What tool calls should be made to reflect the events that occurred at this location? Be sure to only unlock exits if an agent specifically performs an action to unlock the exit, and you believe this is the correct action to take." },
        ];

        const tools = getAvailableTools(null).map(this.aiToolToOllamaTool);

        const response = await this.ollamaRequest(messages, tools, systemPrompt);

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
            { role: "system", content: recentEventsMessage },
            { role: "user", content: "What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different." },
        ];

        const response = await this.ollamaRequest(messages, [], systemPrompt);

        return response.message.content;
    }
}
