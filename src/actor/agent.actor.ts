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
dotenv.config();

export class AgentActor {
    private agentService: AgentService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService;
    private agentMessageService: AgentMessageService;
    private openai: OpenAI;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
        this.locationService = new LocationService();
        this.agentMessageService = new AgentMessageService();
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
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
        let result = [`You go to the ${desinationLocation.name}.`];
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
        return [`You picked up the ${item.name}.`];
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
        return [`You dropped the ${item.name}.`];
    }

    public async lookAround(): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;
        const result: string[] = [];
        result.push(`You look around the ${location.name}.`);
        result.push(location.longDescription);
        const items = await location.items;
        items.forEach(i => {
            result.push(`${i.name}: ${i.shortDescription}`);
        });
        exits.forEach(e => {
            result.push(`To the ${e.direction}: ${e.shortDescription}`);
        });
        // Other agents
        const agents = await this.agentService.getAgentsByLocation(location.locationId);
        agents.forEach(a => {
            result.push(`You see ${a.name}, ${a.shortDescription}.`);
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

        const item = await this.itemService.getItemById(itemId);
        const result: string[] = [];
        result.push(`You look at the ${item.name}.`);
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
        result.push(`You look at the ${exit.name}.`);
        result.push(exit.longDescription);
        return result;
    }

    public async lookAtLocation(locationId: string): Promise<string[]> {
        await initialiseDatabase();
        const location = await this.locationService.getLocationById(locationId);
        const result: string[] = [];
        result.push(`You look at the ${location.name}.`);
        result.push(location.longDescription);
        return result;
    }

    public async speakToAgent(agentId: string, message: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agentService.getAgentById(agentId);
        const result: string[] = [];
        result.push(`You speak to the ${agent.name}.`);

        await this.agentMessageService.createMessage(this.agentId, agentId, message);
        const otherAgentActor = new AgentActor(agentId);
        const response = await otherAgentActor.respondToAgent(this.agentId);
        return response;
    }

    public async respondToAgent(otherAgentId: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const otherAgent = await this.agentService.getAgentById(otherAgentId);
        const result: string[] = [];
        result.push(`You respond to the ${agent.name}.`);

        const agentMessageService = new AgentMessageService();
        // Get previous messages between agents
        const agentMessages = await agentMessageService.getMessagesBetweenAgents(this.agentId, otherAgentId);
        // Create a new message via openai
        const messages: ChatCompletionMessageParam[] = agentMessages.map(m => {
            return {
                role: m.senderAgentId === this.agentId ? "user" : "assistant",
                content: m.content
            };
        });
        messages.unshift({
            role: "system",
            content: `You are ${agent.name}, ${agent.shortDescription}. Your backstory is ${agent.backstory}. Your mood is ${agent.mood}. Your current intent is ${agent.currentIntent}. Your goal is ${agent.goal}. You are talking to ${otherAgent.name}, ${otherAgent.shortDescription}.`
        });
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o",
            messages
        });
        // Save the message to the database
        const messageText = response.choices[0].message.content ?? "";
        await agentMessageService.createMessage(this.agentId, otherAgentId, messageText);
        return [messageText];
    }
}
