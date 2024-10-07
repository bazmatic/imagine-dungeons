// Handle autonomous agents

import OpenAI from "openai";
import { CommandService } from "./Command.service";
import { AgentActor } from "@/actor/agent.actor";
import { Agent } from "@/entity/Agent";
import { Location } from "@/entity/Location";
import { Item } from "@/entity/Item";
export class AutonomousAgentService {

    // Handle autonomous agents
    // For each agent with autonomous = true
        // Feed it a description of its current location, etc just like for a player,
        // And a history of previous commands and output
        // Then ask the agent what it wants to do
        // Send the command off to the CommandService to be executed

    private commandService: CommandService;
    private openai: OpenAI;

    constructor() {
        this.commandService = new CommandService();
    }

    public async handleAutonomousAgent(agentId: string) {
        const agentActor: AgentActor = new AgentActor(agentId);
        const agent: Agent = await agentActor.agent();
        const location: Location = await agent.location;
        const inventory: Item[] = await agent.items;
        const previousCommands = await this.commandService.getRecentCommands(agentId, 6);
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];
        const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
            role: "system",
            content: `You are ${agent.name}, an autonomous agent in a game.
            Your location: ${location.shortDescription}
            Your inventory: ${inventory.map(item => item.name).join(", ")}
            Your mood: ${agent.mood}
            Your current goal: ${agent.goal}
            Your backstory: ${agent.backstory}`
        };

        for (const command of previousCommands) {
            messages.push({
                role: "assistant",
                content: command.raw_text
            });
            messages.push({
                role: "user",
                content: command.text_response
            });
        }
        messages.push({
            role: "user",
            content: "What do you want to do?"
        });


    }
}