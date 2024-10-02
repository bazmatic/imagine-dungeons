import { Character } from "@/entity/Character";
import { Exit } from "@/entity/Exit";
import { CharacterService } from "@/services/Character.service";
import { ExitService } from "@/services/Exit.service";
import { ItemService } from "@/services/Item.service";
import { LocationService } from "@/services/Location.service";
import { initialiseDatabase } from "..";
import { GameObjectKind } from "@/entity/BaseItem";
import { Item } from "@/entity/Item";
import { BaseItemService } from "@/services/BaseItem.service";


export class CharacterActor {
    private locationService: LocationService;
    private itemService: ItemService;
    private characterService: CharacterService
    private exitService: ExitService;
    private baseItemService: BaseItemService;

    constructor(public characterId: string) {
        this.locationService = new LocationService();
        this.itemService = new ItemService();
        this.characterService = new CharacterService();
        this.exitService = new ExitService();
        this.baseItemService = new BaseItemService();
    }

    public async character(): Promise<Character > {
        return this.characterService.getCharacterById(this.characterId);
    }

    public async ownsItem(itemId: string): Promise<boolean> {
        await initialiseDatabase();
        const character = await this.character();
        const ownedItem = character.items.find(item => item.itemId === itemId);
        return !!ownedItem;
    }

    public async inventory(): Promise<Item[]> {
        await initialiseDatabase();
        const character = await this.characterService.getCharacterById(this.characterId);
        
        const items: Item[] = character.items;
        return items;
    }


    public async go(exitId: string): Promise<void> {
        await initialiseDatabase();
        const character = await this.character();
        const location = await this.locationService.getLocationById(character.location.locationId);
        const exit = location.exits.find(e => e.exit_id === exitId);
        if (!exit) {
            throw new Error("Exit not found");
        }
        const exitEntity: Exit = await this.exitService.getById(exitId);
        character.ownerId = exitEntity.destinationId;
        await this.characterService.updateCharacterLocation(this.characterId, exitEntity.destinationId);      
    }

    public async pickUp(itemId: string, fromTarget?: string): Promise<void> {
        await initialiseDatabase();
        const character = await this.character();

        if (fromTarget) {
            // Get the item from the target
            // Check that the character owns the target
            const ownsTarget = await this.ownsItem(fromTarget);
            if (!ownsTarget) {
                throw new Error("Not the owner");
            }
            const item = await this.itemService.getItemById(fromTarget);
            if (!item) {
                throw new Error("Item not found");
            }
            item.ownerId = character.character_id;
            await this.itemService.updateItem(fromTarget, item);
        }
        const itemPresent = await this.itemIsAccessible(itemId);
        if (!itemPresent) {
            throw new Error("Item not found");
        }
        const item = await this.itemService.getItemById(itemId);
        item.ownerId = character.character_id;
        await this.itemService.updateItem(itemId, item);
    }

    public async drop(itemId: string): Promise<void> {
        await initialiseDatabase();
        const character = await this.character();
        const itemOwned = character.items.find(i => i.itemId === itemId);
        if (!itemOwned) {
            throw new Error("Item not found");
        }
        const item = await this.itemService.getItemById(itemId);
        item.ownerId = character.location.locationId;
        await this.itemService.updateItem(itemId, item);
    }

    public async lookAround(): Promise<string[]> {
        await initialiseDatabase();
        const character = await this.character();
        const location = await this.locationService.getLocationById(character.location.locationId);
        //const locationActor = new LocationActor(character.location.locationId, this.characterId);


        const exits = await location.exits;
        const result: string[] = [];
        result.push(location.longDescription);
        location.items.forEach(i => {
            result.push(i.shortDescription);
        });
        exits.forEach(e => {
            result.push(`To the ${e.direction}: ${e.shortDescription}`);
        });
        return result;
    }

    public async itemIsAccessible(itemId: string): Promise<boolean> {
        await initialiseDatabase();
        const character = await this.characterService.getCharacterById(this.characterId);
        //const location = //await this.locationService.getLocationById(character.location.)
        //const locationActor = new LocationActor(character.location.locationId, this.characterId);
        const inventory = await this.inventory();
        //const itemsHere = await locationActor.itemsPresent();
        const accessibleItems = inventory.concat(character.location.items);
        return !!(accessibleItems.find(i => i.itemId === itemId));
    }

    public async lookAtItem(itemId: string): Promise<string[]> {
        await initialiseDatabase();
        
        //const character = await this.characterService.getCharacterById(this.characterId);
        
        // If item is not in my inventory or present in my location,
        if (!this.itemIsAccessible(itemId)) {
            throw new Error("Item not found");
        }
        
        const item = await this.itemService.getItemById(itemId);
        const result: string[] = [];
        result.push(item.longDescription);
        return result;
    }

    public async lookAtCharacter(characterId: string): Promise<string[]> {
        await initialiseDatabase();
        const targetCharacter = await this.characterService.getCharacterById(characterId);
        const result: string[] = [];
        result.push(targetCharacter.longDescription);
        return result;
    }

    public async lookAtExit(exitId: string): Promise<string[]> {
        await initialiseDatabase();
        const exit = await this.exitService.getById(exitId);
        const result: string[] = [];
        result.push(exit.longDescription);
        return result;
    }

    public async look(id?: string): Promise<string[]> {

        if (!id) {
            return this.lookAround();
        }

        const thing = await this.baseItemService.getBaseItemById(id);
        if (thing.kind === GameObjectKind.ITEM) {
            return this.lookAtItem(id);
        }
        if (thing.kind === GameObjectKind.CHARACTER) {
            return this.lookAtCharacter(id);
        }
        if (thing.kind === GameObjectKind.EXIT) {
            return this.lookAtExit(id);
        }
        throw new Error("Invalid object kind");
    }

}
