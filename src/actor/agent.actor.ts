import dotenv from "dotenv";
import { Agent } from "@/entity/Agent";
import { AgentService } from "@/services/Agent.service";
import { Exit } from "@/entity/Exit";
import { ExitService } from "@/services/Exit.service";
import { initialiseDatabase } from "..";
import { ItemService } from "@/services/Item.service";
import { LocationService } from "@/services/Location.service";
import { OpenAI } from "openai";
import { Location } from "@/entity/Location";
import { Item } from "@/entity/Item";
import { CommandService } from "@/services/Command.service";
import {  Interpreter } from "@/services/Interpreter";
import { Command } from "@/entity/Command";

dotenv.config();

export class AgentActor {
    private agentService: AgentService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService;
    private commandService: CommandService;
    private interpreter: Interpreter;
    private openai: OpenAI;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
        this.locationService = new LocationService();
        this.commandService = new CommandService();
        this.interpreter = new Interpreter();
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
    }

    // Decide what to do and do it. Return the commands that were issued.
    public async act(): Promise<Command[]> {
        //=== Get the context
        const agent: Agent = await this.agent();

        // Location and inventory
        const location: Location = await agent.location;
        const inventory: Item[] = await agent.items;
        const itemsPresent: Item[] = await location.items;

        // OpenAI messages
        const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
            role: "system",
            content: `You are ${agent.label}, an autonomous agent in a game.
            Your location: ${location.shortDescription}
            Items present: ${itemsPresent.map(item => item.label).join(", ")}
            Your inventory: ${inventory.map(item => item.label).join(", ")}
            Your mood: ${agent.mood}
            Your current intent: ${agent.currentIntent}
            Your long-term goal: ${agent.goal}
            Your backstory: ${agent.backstory}`
        };
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [systemMessage];
        // Previous commands and response
        const previousCommands = await this.commandService.getRecentCommands(this.agentId, 6);

        // Now make historical messages using the input_text and response_text
        for (const c of previousCommands) {
            if (c.input_text) {
                messages.push({
                    role: "assistant",
                    content: c.input_text
                });
            }
            messages.push({
                role: "user",
                content: (await this.interpreter.describeCommandResult(agent, c)).join("\n") // Describe the result of the command as if a DM was describing it to the player
            });
        };

        // Ask the agent what to do
        messages.push({
            role: "user",
            content: `What do you want to do?`
        });


        console.log(`Messages: ${JSON.stringify(messages)}`);

        // Get the response from the agent
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages
        });

        const choices = response.choices;
        if (!choices || choices.length === 0) {
            throw new Error("No choices from OpenAI");
        }

        const inputText = choices[0].message.content;
        if (!inputText) {
            throw new Error("No command found");
        }

        // Issue the command
        const commands: Command[] = await this.interpreter.interpret(this.agentId, inputText);
        return commands;
   
    }

    public async setGoal(goal: string): Promise<void> {
        await initialiseDatabase();
        const agent = await this.agent();
        await this.agentService.updateAgentGoal(agent.agentId, goal);
    }

    public async ownsItem(itemId: string): Promise<boolean> {
        await initialiseDatabase();
        const agent = await this.agent();
        const ownedItems = await agent.items;
        const ownedItem = ownedItems.find(item => item.itemId === itemId);
        return !!ownedItem;
    }

    public async goExit(exitId: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;
        const exit = exits.find(e => e.exitId === exitId);
        if (!exit) {
            throw new Error("Exit not found");
        }
        const exitEntity: Exit = await this.exitService.getById(exitId);
        const desinationLocation = await this.locationService.getLocationById(exitEntity.destinationId);
        await this.agentService.updateAgentLocation(agent.agentId, desinationLocation.locationId);
        let result = [`${agent.label} goes to the ${desinationLocation.label}.`];
        result = result.concat(await this.lookAround());
        return result;
    }

    public async pickUp(itemId: string, fromTarget?: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();

        if (fromTarget) {
            // Get the item from the target
            // Check that the agent owns the target
            const ownsTarget = await this.ownsItem(fromTarget);
            if (!ownsTarget) {
                throw new Error("Not the owner");
            }
            const item = await this.itemService.getItemById(fromTarget);
            if (!item) {
                throw new Error("Item not found");
            }
        }
        else {
            const itemPresent = await this.itemIsAccessible(itemId);
            if (!itemPresent) {
                throw new Error("Item not found");
            }
        }
        await this.itemService.setOwnerToAgent(itemId, agent.agentId);
        const item = await this.itemService.getItemById(itemId);
        return [`${agent.label} picks up the ${item.label}.`];
    }

    public async dropItem(itemId: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const ownedItems = await agent.items;
        const itemOwned = ownedItems.find(i => i.itemId === itemId);
        if (!itemOwned) {
            throw new Error("Item not found");
        }
        // Set owner to agent's location
        const location = await agent.location;
        await this.itemService.setOwnerToLocation(itemId, location.locationId);
        const item = await this.itemService.getItemById(itemId);
        return [`${agent.label} drops the ${item.label}.`];
    }

    public async lookAround(): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;

        const result: string[] = [];
        result.push(location.longDescription);
        // Other agents

        const agentsPresent = await this.agentService.getAgentsByLocation(location.locationId);
        const itemsPresent = await location.items;
        exits.forEach(e => {
            result.push(`To the ${e.direction}: ${e.shortDescription}`);
        });

        for (const agent of agentsPresent) {
            result.push(`${agent.label} is here.`);
        }
        for (const item of itemsPresent) {
            result.push(
                `There is a${startsWithVowel(item.label) ? "n" : ""} ${
                    item.label
                } here.`
            );
        }

        return result;
    }

    public async itemIsAccessible(itemId: string): Promise<boolean> {
        await initialiseDatabase();
        const agent: Agent = await this.agentService.getAgentById(this.agentId);
        const inventory = await agent.items;
        const location = await agent.location;
        const itemsHere = await location.items;
        const accessibleItems = inventory.concat(itemsHere);
        return !!accessibleItems.find(i => i.itemId === itemId);
    }

    public async lookAtItem(itemId: string): Promise<string[]> {
        await initialiseDatabase();
        // If item is not in my inventory or present in my location,
        if (!this.itemIsAccessible(itemId)) {
            throw new Error("Item not found");
        }

        const item = await this.itemService.getItemById(itemId);
        const result: string[] = [];
        result.push(item.longDescription);
        return result;
    }

    public async lookAtAgent(agentId: string): Promise<string[]> {
        await initialiseDatabase();
        const targetAgent = await this.agentService.getAgentById(agentId);
        const result: string[] = [];
        result.push(targetAgent.longDescription);
        return result;
    }

    public async lookAtExit(exitId: string): Promise<string[]> {
        await initialiseDatabase();
        const exit = await this.exitService.getById(exitId);
        const result: string[] = [];
        result.push(exit.longDescription);
        return result;
    }

    public async lookAtLocation(locationId: string): Promise<string[]> {
        await initialiseDatabase();
        const location = await this.locationService.getLocationById(locationId);
        const result: string[] = [];
        result.push(location.longDescription);
        return result;
    }

    public async speakToAgent(targetAgentId: string, message: string): Promise<string[]> {
        await initialiseDatabase();
        const targetAgent = await this.agentService.getAgentById(targetAgentId);
        const result: string[] = [];
        result.push(message);
        if (targetAgent.autonomous) {
            await this.agentService.activateAutonomy(targetAgentId, true);
        }
        return result;
    }

    public async updateAgentIntent(agentId: string, intent: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agentService.getAgentById(agentId);
        await this.agentService.updateAgentIntent(agentId, intent);
        return [intent];
    }

}

function startsWithVowel(word: string): boolean {
    return ["a", "e", "i", "o", "u"].includes(word[0].toLowerCase());
}