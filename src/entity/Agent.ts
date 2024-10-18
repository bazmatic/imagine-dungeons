import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";
import { Location } from "./Location";
import { Item, ItemDto } from "./Item";
import { Exit } from "./Exit";
import { ExitService } from "@/services/Exit.service";
import { LocationService } from "@/services/Location.service";
import { AgentService } from "@/services/Agent.service";
import { ItemService } from "@/services/Item.service";
import { startsWithVowel } from "@/utils/strings";

@Entity("agent")
export class Agent implements IBaseProperties {
    @PrimaryColumn({ name: "agent_id" })
    agentId: string;

    kind: GameObjectKind = GameObjectKind.AGENT;

    @Column({ name: "name" })
    label: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "owner_location_id" })
    ownerLocationId: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "mood" })
    mood: string;

    @Column({ name: "backstory" })
    backstory: string;

    @Column({ name: "goal" })
    goal: string;

    @Column({ name: "current_intent" })
    currentIntent: string;
    
    @Column()
    capacity: number;

    @Column()
    health: number;

    @Column()
    damage: number;

    @Column()
    defence: number;

    // Relation to Items owned by the Agent
    @OneToMany(() => Item, item => item.ownerAgent, { lazy: true })
    items: Promise<Item[]>;

    // Relation to Location (Owner)
    @ManyToOne(() => Location, location => location.agents, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_location_id", referencedColumnName: "locationId" })
    location: Promise<Location>;

    @Column({ name: "autonomous" })
    autonomous: boolean;

    @Column({ name: "activated" })
    activated: boolean;

    public async toDto(system: boolean = false): Promise<AgentDto> {
        const items: Item[] = await this.items;
        return {
            id: this.agentId,
            label: this.label,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            locationId: this.ownerLocationId,
            capacity: system ? this.capacity : undefined,
            backstory: system ? this.backstory : undefined,
            items: system ? await Promise.all(items.map(item => item.toDto(system))) : [],
            defence: system ? this.defence : undefined,
            autonomous: this.autonomous
        };
    }


    public async wait(): Promise<string[]> {
        return [];
    }

    public async setGoal(goal: string): Promise<void> {
        const agentService = new AgentService();
        await agentService.updateAgentGoal(this.agentId, goal);
    }

    public async ownsItem(itemId: string): Promise<boolean> {
        const agentService = new AgentService();
        const agent = await agentService.getAgentById(this.agentId);
        const ownedItems = await agent.items;
        const ownedItem = ownedItems.find(item => item.itemId === itemId);
        return !!ownedItem;
    }

    public async goExit(exitId: string): Promise<string[]> {
        const exitService = new ExitService();  
        const locationService = new LocationService();
        const agentService = new AgentService();

        const location = await this.location;
        const exits = await location.exits;
        const exit = exits.filter(e => !e.hidden).find(e => e.exitId === exitId);
        if (!exit) {
            return [`You can't go that way.`];
        }
        if (exit.locked) {
            return [`It's locked.`];
        }
        
        const exitEntity: Exit = await exitService.getById(exitId);
        const desinationLocation = await locationService.getLocationById(
            exitEntity.destinationId
        );
        await agentService.updateAgentLocation(
            this.agentId,
            desinationLocation.locationId
        );
        const updatedAgent = await agentService.getAgentById(this.agentId);
        const result = await updatedAgent.lookAround();
        return result;
    }

    public async pickUp(
        itemId: string,
        fromTarget?: string
    ): Promise<string[]> {
        const itemService = new ItemService();
        if (fromTarget) {
            // Get the item from the target
            // Check that the agent owns the target
            const ownsTarget = await this.ownsItem(fromTarget);
            if (!ownsTarget) {
                return [`You can't pick that up.`];
            }
            const item = await itemService.getItemById(fromTarget);
            if (!item) {
                return [`That doesn't exist.`];
            }
        } else {
            const itemPresent = await this.itemIsAccessible(itemId);
            if (!itemPresent) {
                return [`You can't reach that.`];
            }
        }
        await itemService.setOwnerToAgent(itemId, this.agentId);
        return [];
    }

    public async searchItem(itemId: string): Promise<string[]> {
        const itemService = new ItemService();
        const item = await itemService.getItemById(itemId);
        if (!item) {
            return [`That doesn't exist.`];
        }
        return [];
    }

    public async getItemFromItem(itemId: string, targetItemId: string): Promise<string[]> {
        const itemService = new ItemService();
        const item = await itemService.getItemById(itemId);
        const targetItem = await itemService.getItemById(targetItemId);
        if (!item || !targetItem) {
            return [`That doesn't exist.`];
        }
        await itemService.setOwnerToAgent(itemId, this.agentId);
        return [];
    }

    public async dropItem(itemId: string): Promise<string[]> {
        const itemService = new ItemService();
        const ownedItems = await this.items;
        const itemOwned = ownedItems.find(i => i.itemId === itemId);
        if (!itemOwned) {
            return [`You don't have that.`];
        }
        // Set owner to agent's location
        const location = await this.location;
        await itemService.setOwnerToLocation(itemId, location.locationId);
        return [];
    }

    public async searchLocation(): Promise<string[]> {
        return Promise.resolve([]);
    }

    public async emote(emote: string): Promise<string[]> {
        return Promise.resolve([emote]);
    }

    public async lookAround(): Promise<string[]> {
        const agentService = new AgentService();
        const location = await this.location;
        const exits = await location.exits;

        const result: string[] = [];
        result.push(location.longDescription);
        // Other agents

        const agentsPresent = (
            await agentService.getAgentsByLocation(location.locationId)
        ).filter(a => a.agentId !== this.agentId);

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


    public async lookAtItem(itemId: string): Promise<string[]> {   
        // If item is not in my inventory or present in my location,
        if (!this.itemIsAccessible(itemId)) {
            throw new Error("Item not found");
        }
        const itemService = new ItemService();
        const item = await itemService.getItemById(itemId);
        const result: string[] = [];
        result.push(item.longDescription);
        return result;
    }

    public async lookAtAgent(agentId: string): Promise<string[]> {
        const agentService = new AgentService();
        const targetAgent = await agentService.getAgentById(agentId);

        // If the target agent is not in the same location, then I can't see it
        const agentLocation = await this.location;
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
        const exitService = new ExitService();
        const exit = await exitService.getById(exitId);
        const result: string[] = [];
        result.push(exit.longDescription);
        return result;
    }

    public async lookAtLocation(locationId: string): Promise<string[]> {
        const locationService = new LocationService();
        const location = await locationService.getLocationById(locationId);
        return [location.longDescription];
    }

    public async speakToAgent(
        targetAgentId: string,
        message: string
    ): Promise<string[]> {
        const agentService = new AgentService();
        const targetAgent = await agentService.getAgentById(targetAgentId);
        const targetAgentLocation = await targetAgent.location;
        const agentLocation = await this.location;

        if (agentLocation.locationId !== targetAgentLocation.locationId) {
            return [`You can't see ${targetAgent.label}.`];
        } else {
            
            if (targetAgent.autonomous) {
                await agentService.activateAutonomy(targetAgentId, true);
            }
            return [message];
        }
    }

    public async attackAgent(targetAgentId: string): Promise<string[]> {
        const agentService = new AgentService();
        const targetAgent = await agentService.getAgentById(targetAgentId);
        const targetAgentLocation = await targetAgent.location;
        const agentLocation = await this.location;

        if (agentLocation.locationId !== targetAgentLocation.locationId) {
            return [`You can't see ${targetAgent.label}.`];
        } else if (targetAgent.autonomous) {
            await agentService.activateAutonomy(targetAgentId, true);
        }
        // Roll a d20 to see if the attack hits
        const details: string[] = [];
        const hitRoll = Math.floor(Math.random() * 20) + 1;
        if (hitRoll >= targetAgent.defence) {
            details.push(`${this.label} hits ${targetAgent.label}.`);
            // Roll a 6 sided die for each point of damage
            let totalDamage = 0;
            for (let i = 0; i < this.damage; i++) {
                totalDamage += Math.floor(Math.random() * 6) + 1;
            }
            details.push(`${this.label} does ${totalDamage} damage to ${targetAgent.label}.`);
            const updatedTargetAgent = await targetAgent.sustainDamage(-totalDamage);
            if (await updatedTargetAgent.isDead()) {
                details.push(`${updatedTargetAgent.label} is dead.`);
                await agentService.activateAutonomy(targetAgentId, false);
            }
        } else {
            details.push(`${this.label} misses ${targetAgent.label}.`);
        }
        return details;
    }

    public async updateAgentIntent(
        agentId: string,
        intent: string
    ): Promise<string[]> {
        const agentService = new AgentService();
        await agentService.updateAgentIntent(agentId, intent);
        return [intent];
    }

    public async updateAgentMood(agentId: string, mood: string): Promise<string[]> {
        const agentService = new AgentService();
        await agentService.updateAgentMood(agentId, mood);
        return [mood];
    }

    public async sustainDamage(health: number): Promise<Agent> {
        const agentService = new AgentService();
        const updatedAgent = await agentService.updateAgentHealth(this.agentId, health);
        return updatedAgent;
    }

    public async giveItemToAgent(
        itemId: string,
        targetAgentId: string
    ): Promise<string[]> {
        const agentService = new AgentService();
        const itemService = new ItemService();

        try {
            const targetAgent = await agentService.getAgentById(
                targetAgentId
            );

            // Check if the item is in the agent's inventory
            if (!(await this.ownsItem(itemId))) {
                throw new Error("Item not found in inventory");
            }

            // Check if the target agent is in the same location
            const agentLocation = await this.location;
            const targetAgentLocation = await targetAgent.location;
            if (agentLocation.locationId !== targetAgentLocation.locationId) {
                return [`You can't see ${targetAgent.label}.`];
            }

            // Transfer the item
            await itemService.setOwnerToAgent(itemId, targetAgentId);;
            return [];
        } catch (error) {
            return [`That didn't work.`];
        }
    }

    public async useItem(itemId: string, _objectType: string, _objectId: string): Promise<string[]> {
        const itemService = new ItemService();
        const item = await itemService.getItemById(itemId);
        if (!item) {
            return [`That doesn't exist.`];
        }
        return [];
    }

    public async getInventory(): Promise<string[]> {
        const inventory = await this.items;

        if (inventory.length === 0) {
            return ["Your inventory is empty."];
        }

        const itemLabels = inventory.map(item => item.label).join(", ");
        return [`Your inventory contains: ${itemLabels}`];
    }

    public async itemIsAccessible(itemId: string): Promise<boolean> {
        const agentService = new AgentService();
        const agent: Agent = await agentService.getAgentById(this.agentId);
        const inventory = await agent.items;
        const location = await agent.location;
        const itemsHere = await location.items;
        const accessibleItems = inventory.concat(itemsHere);
        return !!accessibleItems.filter(i => !i.hidden).find(i => i.itemId === itemId);
    }

    public async isDead(): Promise<boolean> {
        return this.health <= 0;
    }


}

export class AgentDto implements IBaseProperties {
    id: string;
    label: string;
    shortDescription: string;
    longDescription: string;
    locationId: string;
    capacity?: number;
    backstory?: string;
    items?: ItemDto[];
    defence?: number;
    autonomous?: boolean;
}