import { Agent } from "@/entity/Agent";
import { AgentService } from "@/services/Agent.service";
import { Exit } from "@/entity/Exit";
import { ExitService } from "@/services/Exit.service";
import { initialiseDatabase } from "..";
import { ItemService } from "@/services/Item.service";
import { LocationService } from "@/services/Location.service";

export class AgentActor {
    private agentService: AgentService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
        this.locationService = new LocationService();
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

    public async goExit(exitId: string): Promise<void> {
        await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;
        const exit = exits.find(e => e.exitId === exitId);
        if (!exit) {
            throw new Error("Exit not found");
        }
        const exitEntity: Exit = await this.exitService.getById(exitId);
        agent.ownerId = exitEntity.destinationId;
        await this.agentService.updateAgentLocation(
            this.agentId,
            exitEntity.destinationId
        );
    }

    public async pickUp(itemId: string, fromTarget?: string): Promise<void> {
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
            item.ownerId = agent.agentId;
            await this.itemService.updateItem(fromTarget, item);
        }
        const itemPresent = await this.itemIsAccessible(itemId);
        if (!itemPresent) {
            throw new Error("Item not found");
        }
        const item = await this.itemService.getItemById(itemId);
        item.ownerId = agent.agentId;
        await this.itemService.updateItem(itemId, item);
    }

    public async dropItem(itemId: string): Promise<void> {
        await initialiseDatabase();
        const agent = await this.agent();
        const ownedItems = await agent.items;
        const itemOwned = ownedItems.find(i => i.itemId === itemId);
        if (!itemOwned) {
            throw new Error("Item not found");
        }
        const item = await this.itemService.getItemById(itemId);
        const location = await agent.location;
        item.ownerId = location.locationId;
        await this.itemService.updateItem(itemId, item);
    }

    public async lookAround(): Promise<string[]> {
        await initialiseDatabase();
        const agent = await this.agent();
        const location = await agent.location;
        const exits = await location.exits;
        const result: string[] = [];
        result.push(location.longDescription);
        const items = await location.items;
        items.forEach(i => {
            result.push(i.shortDescription);
        });
        exits.forEach(e => {
            result.push(`To the ${e.direction}: ${e.shortDescription}`);
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
}
