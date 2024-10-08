import { Agent } from "@/entity/Agent";
import { AgentService } from "@/services/Agent.service";
import { Exit } from "@/entity/Exit";
import { ExitService } from "@/services/Exit.service";
import { initialiseDatabase } from "..";
import { ItemService } from "@/services/Item.service";
import { LocationService } from "@/services/Location.service";
import { OpenAI } from "openai";
import dotenv from "dotenv";
import { AgentMessageService } from "@/services/AgentMessage.service";
import { ChatCompletionMessageParam } from "openai/resources";
import { Location } from "@/entity/Location";
import { Item } from "@/entity/Item";
import { CommandService } from "@/services/Command.service";
dotenv.config();

export class AgentActor {
    private agentService: AgentService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService;
    private agentMessageService: AgentMessageService;
    private commandService: CommandService;
    private openai: OpenAI;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
        this.locationService = new LocationService();
        this.agentMessageService = new AgentMessageService();
        this.commandService = new CommandService();
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
    }

    // Decide what to do and do it
    public async act(): Promise<string[]> {
        //=== Get the context
        const agent: Agent = await this.agent();

        // Location and inventory
        const location: Location = await agent.location;
        const inventory: Item[] = await agent.items;
        const itemsPresent: Item[] = await location.items;

        // Previous commands and response
        const previousCommands = await this.commandService.getRecentCommands(this.agentId, 6);

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

        // Now make historical messages using the input_text and response_text
        previousCommands.forEach(c => {
            if (c.input_text) {
                messages.push({
                    role: "assistant",
                    content: c.input_text
                });
            }
            messages.push({
                role: "user",
                content: c.response_text
            });
        });

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

        const agentCommand = choices[0].message.content;
        if (!agentCommand) {
            throw new Error("No command found");
        }

        // Issue the command
        const resultText = await this.commandService.issueCommand(this.agentId, agentCommand);
        return resultText;
    }

    // Show some text to the agent
    public async sense(text: string): Promise<void> {
        // TODO
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
        result.push(`${agent.label} looks around the ${location.label}.`);
        result.push(location.longDescription);
        const items = await location.items;
        items.forEach(i => {
            result.push(`${i.label}: ${i.shortDescription}`);
        });
        exits.forEach(e => {
            result.push(`To the ${e.direction}: ${e.shortDescription}`);
        });
        // Other agents
        const agents = await this.agentService.getAgentsByLocation(location.locationId);

        agents.filter(a => a.agentId !== agent.agentId).forEach(a => {
            result.push(`${agent.label} sees ${a.label}, ${a.shortDescription}.`);
        });
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

        const agent = await this.agent();
        const item = await this.itemService.getItemById(itemId);
        const result: string[] = [];
        result.push(`${agent.label} looks at the ${item.label}.`);
        result.push(item.longDescription);
        return result;
    }

    public async lookAtAgent(agentId: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const targetAgent = await this.agentService.getAgentById(agentId);
        const result: string[] = [];
        result.push(`${agent.label} looks at ${targetAgent.label}.`);
        result.push(targetAgent.longDescription);
        return result;
    }

    public async lookAtExit(exitId: string): Promise<string[]> {
        await initialiseDatabase();
        const exit = await this.exitService.getById(exitId);
        const agent = await this.agent();
        const result: string[] = [];
        result.push(`${agent.label} looks at the ${exit.name}.`);
        result.push(exit.longDescription);
        return result;
    }

    public async lookAtLocation(locationId: string): Promise<string[]> {
        await initialiseDatabase();
        const location = await this.locationService.getLocationById(locationId);
        const result: string[] = [];
        const agent = await this.agent();
        result.push(`${agent.label} looks at the ${location.label}.`);
        result.push(location.longDescription);
        return result;
    }

    public async speakToAgent(targetAgentId: string, message: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const targetAgent = await this.agentService.getAgentById(targetAgentId);
        const result: string[] = [];
        result.push(`${agent.label} speaks to ${targetAgent.label}.`);
        result.push(message);
        if (targetAgent.autonomous) {
            await this.agentService.activateAutonomy(targetAgentId, true);
        }
        //await this.agentMessageService.createMessage(this.agentId, targetAgentId, message);
        await this.commandService.saveAgentCommand(
            targetAgentId,
            undefined,
            `${agent.label} speaks to ${targetAgent.label}, saying "${message}"`,
            undefined
        );
 //respondToAgent(this.agentId);
        return result;
    }

    public async updateAgentIntent(agentId: string, intent: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agentService.getAgentById(agentId);
        await this.agentService.updateAgentIntent(agentId, intent);
        return [`${agent.label} updates their intent to "${intent}".`];
    }

  


    // public async speakToAgent(otherAgentId: string): Promise<string[]> {
    //     await initialiseDatabase();
    //     const agent = await this.agent();
    //     const otherAgent = await this.agentService.getAgentById(otherAgentId);
    //     const result: string[] = [];
    //     result.push(`You respond to the ${agent.name}.`);

    //     const agentMessageService = new AgentMessageService();
    //     // Get previous messages between agents
    //     const agentMessages = await agentMessageService.getMessagesBetweenAgents(this.agentId, otherAgentId);
    //     // Create a new message via openai
    //     const messages: ChatCompletionMessageParam[] = agentMessages.map(m => {
    //         return {
    //             role: m.senderAgentId === this.agentId ? "user" : "assistant",
    //             content: m.content
    //         };
    //     });
    //     messages.unshift({
    //         role: "system",
    //         content: `You are ${agent.name}, ${agent.shortDescription}. Your backstory is ${agent.backstory}. Your mood is ${agent.mood}. Your current intent is ${agent.currentIntent}. Your goal is ${agent.goal}. You are talking to ${otherAgent.name}, ${otherAgent.shortDescription}.`
    //     });
    //     const response = await this.openai.chat.completions.create({
    //         model: "gpt-4o",
    //         messages
    //     });
    //     // Save the message to the database
    //     const messageText = response.choices[0].message.content ?? "";
    //     await agentMessageService.createMessage(this.agentId, otherAgentId, messageText);
    //     return [messageText];
    // }
}
