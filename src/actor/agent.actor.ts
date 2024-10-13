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
import { GameEventService } from "@/services/GameEventService";
import { Interpreter } from "@/services/Interpreter";
import { GameEvent } from "@/entity/GameEvent";

dotenv.config();

export class AgentActor {
    private agentService: AgentService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService;
    private gameEventService: GameEventService;
    private interpreter: Interpreter;
    private openai: OpenAI;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
        this.locationService = new LocationService();
        this.gameEventService = new GameEventService();
        this.interpreter = new Interpreter();
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
    }

    // Decide what to do and do it. Return the commands that were issued.
    public async act(): Promise<GameEvent[]> {
        //=== Get the context
        const agent: Agent = await this.agent();
        if (agent.health <= 0) {
            return [];
        }

        // Location and inventory
        const location: Location = await agent.location;
        const inventory: Item[] = await agent.items;
        const itemsPresent: Item[] = await location.items;
        const agentsPresent: Agent[] = await location.agents;

        // OpenAI messages
        const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam =
            {
                role: "system",
                content: `You are acting as ${agent.label}, ${
                    agent.longDescription
                }. You are actually an autonomous agent in a game but you won't reveal that.
            Your location: ${location.shortDescription}
            Items present: ${itemsPresent.map(item => item.label).join(", ")}
            Characters present: ${agentsPresent
                .filter(a => a.agentId !== agent.agentId)
                .map(a => a.label)
                .join(", ")}
            Your inventory: ${inventory.map(item => item.label).join(", ")}
            Your emotional state: You are feeling ${agent.mood}
            Your current intent: ${agent.currentIntent}
            Your long-term goal: ${agent.goal}
            Your backstory: ${agent.backstory}`
            };
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            systemMessage
        ];
        // Previous commands and response
        const previousGameEvents = await this.gameEventService.getRecentGameEvents(
            this.agentId,
            6
        );
        // Filter commands

        // Now make historical messages using the input_text and response_text
        for (const ge of previousGameEvents) {
            if (ge.agent_id === this.agentId && ge.input_text) {
                const eventDescription = await this.interpreter.describeCommandResult(
                    agent.agentId,
                    ge
                );
                messages.push({
                    role: "assistant",
                    content: eventDescription?.primary_text ?? "No primary text"
                });
            }
            messages.push({
                role: "user",
                content: ge.input_text ?? "No input text"
            });
        }
        console.log("=== PREVIOUS COMMANDS ===");
        for (const pm of messages) {
            console.log(`${pm.role}: ${pm.content}`);
        }
        console.log("=========================");

        // Ask the agent what to do
        messages.push({
            role: "user",
            content: `What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different.`
        });

        //console.log(`Messages: ${JSON.stringify(messages)}`);

        // Get the instructions from the agent
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-2024-08-06",
            messages
            //seed: 100
        });

        const choices = response.choices;
        if (!choices || choices.length === 0) {
            throw new Error("No choices from OpenAI");
        }

        const inputText = choices[0].message.content;
        if (!inputText) {
            throw new Error("No command found");
        }

        // Issue the command to the interpreter just as if it were a player
        const gameEvents: GameEvent[] = await this.interpreter.interpret(
            this.agentId,
            inputText
        );

        return gameEvents;
    }

    public async wait(): Promise<string[]> {
        //await initialiseDatabase();
        const agent = await this.agent();
        return [`${agent.label} waits.`];
    }

    public async setGoal(goal: string): Promise<void> {
        //await initialiseDatabase();
        const agent = await this.agent();
        await this.agentService.updateAgentGoal(agent.agentId, goal);
    }

    public async ownsItem(itemId: string): Promise<boolean> {
        //await initialiseDatabase();
        const agent = await this.agent();
        const ownedItems = await agent.items;
        const ownedItem = ownedItems.find(item => item.itemId === itemId);
        return !!ownedItem;
    }

    public async goExit(exitId: string): Promise<string[]> {
        //await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;
        const exit = exits.find(e => e.exitId === exitId);
        if (!exit) {
            throw new Error("Exit not found");
        }
        const exitEntity: Exit = await this.exitService.getById(exitId);
        const desinationLocation = await this.locationService.getLocationById(
            exitEntity.destinationId
        );
        await this.agentService.updateAgentLocation(
            agent.agentId,
            desinationLocation.locationId
        );
        // Get agents present in the destination location
        //const agentsPresent = await this.agentService.getAgentsByLocation(desinationLocation.locationId);
        // let result = [
        //     `${agent.label} goes to the ${desinationLocation.label}.`
        // ];
        const result = await this.lookAround();
        return result;
    }

    public async pickUp(
        itemId: string,
        fromTarget?: string
    ): Promise<string[]> {
        //await initialiseDatabase();
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
        } else {
            const itemPresent = await this.itemIsAccessible(itemId);
            if (!itemPresent) {
                return ["It's not here"];
            }
        }
        await this.itemService.setOwnerToAgent(itemId, agent.agentId);
        const item = await this.itemService.getItemById(itemId);
        return [`${agent.label} picks up the ${item.label}.`];
    }

    public async dropItem(itemId: string): Promise<string[]> {
        //await initialiseDatabase();
        const agent = await this.agent();
        const ownedItems = await agent.items;
        const itemOwned = ownedItems.find(i => i.itemId === itemId);
        if (!itemOwned) {
            return [`${agent.label} doesn't have that.`];
        }
        // Set owner to agent's location
        const location = await agent.location;
        await this.itemService.setOwnerToLocation(itemId, location.locationId);
        const item = await this.itemService.getItemById(itemId);
        return [`${agent.label} drops the ${item.label}.`];
    }

    public async searchLocation(): Promise<string[]> {
        //await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        return [`${agent.label} searches the ${location.label}.`];
    }

    public async emote(emote: string): Promise<string[]> {
        //await initialiseDatabase();
        const agent = await this.agent();
        return [`${agent.label}: ${emote}.`];
    }

    public async lookAround(): Promise<string[]> {
        //await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;

        const result: string[] = [];
        result.push(location.longDescription);
        // Other agents

        const agentsPresent = (
            await this.agentService.getAgentsByLocation(location.locationId)
        ).filter(a => a.agentId !== agent.agentId);

        const itemsPresent = (await location.items).filter(i => !i.hidden);
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
        return !!accessibleItems.filter(i => !i.hidden).find(i => i.itemId === itemId);
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
        const agent = await this.agent();
        // If the target agent is not in the same location, then I can't see it
        const agentLocation = await agent.location;
        const targetAgentLocation = await targetAgent.location;
        const result: string[] = [];
        if (agentLocation.locationId !== targetAgentLocation.locationId) {
            result.push(`You can't see ${targetAgent.label}.`);
        } else {
            result.push(targetAgent.longDescription);
            if (targetAgent.health <= 0) {
                result.push(`${targetAgent.label} is dead.`);
            }
        }
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

    public async speakToAgent(
        targetAgentId: string,
        message: string
    ): Promise<string[]> {
        await initialiseDatabase();
        const targetAgent = await this.agentService.getAgentById(targetAgentId);
        const targetAgentLocation = await targetAgent.location;
        const agent = await this.agent();
        const agentLocation = await agent.location;
        const result: string[] = [];
        if (agentLocation.locationId !== targetAgentLocation.locationId) {
            result.push(`You can't see ${targetAgent.label}.`);
        } else {
            result.push(message);
            if (targetAgent.autonomous) {
                await this.agentService.activateAutonomy(targetAgentId, true);
            }
        }
        return result;
    }

    public async attackAgent(targetAgentId: string): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const targetAgent = await this.agentService.getAgentById(targetAgentId);
        const targetAgentLocation = await targetAgent.location;
        const agentLocation = await agent.location;
        const result: string[] = [];
        if (agentLocation.locationId !== targetAgentLocation.locationId) {
            result.push(`You can't see ${targetAgent.label}.`);
        } else {
            if (targetAgent.autonomous) {
                await this.agentService.activateAutonomy(targetAgentId, true);
            }
        }
        // Roll a d20 to see if the attack hits
        const hitRoll = Math.floor(Math.random() * 20) + 1;
        if (hitRoll >= targetAgent.defence) {
            result.push(`${agent.label} hits ${targetAgent.label}.`);
            // Roll a 6 sided die for each point of damage
            let totalDamage = 0;
            for (let i = 0; i < agent.damage; i++) {
                totalDamage += Math.floor(Math.random() * 6) + 1;
            }
            result.push(`${agent.label} does ${totalDamage} damage to ${targetAgent.label}.`);
            await this.agentService.updateAgentHealth(targetAgentId, -totalDamage);
            if (targetAgent.health <= 0) {
                result.push(`${targetAgent.label} is dead.`);
                await this.agentService.activateAutonomy(targetAgentId, false);
            }
        } else {
            result.push(`${agent.label} misses ${targetAgent.label}.`);
        }
        return result;
    }

    public async updateAgentIntent(
        agentId: string,
        intent: string
    ): Promise<string[]> {
        await this.agentService.updateAgentIntent(agentId, intent);
        return [intent];
    }

    public async updateAgentMood(agentId: string, mood: string): Promise<string[]> {
        await this.agentService.updateAgentMood(agentId, mood);
        return [mood];
    }

    public async sustainDamage(agentId: string, health: number): Promise<void> {
        await initialiseDatabase();
        await this.agentService.updateAgentHealth(agentId, health);
    }

    public async giveItemToAgent(
        itemId: string,
        targetAgentId: string
    ): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();

        try {
            const targetAgent = await this.agentService.getAgentById(
                targetAgentId
            );

            // Check if the item is in the agent's inventory
            const ownedItems = await agent.items;
            const itemOwned = ownedItems.find(i => i.itemId === itemId);
            if (!itemOwned) {
                throw new Error("Item not found in inventory");
            }
            console.log(`Item owned: ${itemOwned}`);

            // Check if the target agent is in the same location
            const agentLocation = await agent.location;
            const targetAgentLocation = await targetAgent.location;
            if (agentLocation.locationId !== targetAgentLocation.locationId) {
                throw new Error("Target agent is not in the same location");
            }

            // Transfer the item
            await this.itemService.setOwnerToAgent(itemId, targetAgentId);
            //const item = await this.itemService.getItemById(itemId);

            return []; //`${agent.label} gives the ${item.label} to ${targetAgent.label}.`]
        } catch (error) {
            return [`That didn't work.`];
        }
    }

    public async getInventory(): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const inventory = await agent.items;

        if (inventory.length === 0) {
            return ["Your inventory is empty."];
        }

        const itemLabels = inventory.map(item => item.label).join(", ");
        return [`Your inventory contains: ${itemLabels}`];
    }

}

function startsWithVowel(word: string): boolean {
    return ["a", "e", "i", "o", "u"].includes(word[0].toLowerCase());
}
