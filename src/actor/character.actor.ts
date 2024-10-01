import { Character } from "@/entity/Character";
import { Exit } from "@/entity/Exit";
import { CharacterService } from "@/services/Character.service";
import { ExitService } from "@/services/Exit.service";
import { ItemService } from "@/services/Item.service";
import { LocationService } from "@/services/Location.service";
import { initialiseDatabase } from "..";
import { GameObjectKind } from "@/entity/BaseItem";


export class CharacterActor {
    private locationService: LocationService;
    private itemService: ItemService;
    private characterService: CharacterService
    private exitService: ExitService;

    constructor(public characterId: string) {
        this.locationService = new LocationService();
        this.itemService = new ItemService();
        this.characterService = new CharacterService();
        this.exitService = new ExitService();
    }

    public async go(exitId: string): Promise<void> {
        await initialiseDatabase();
        const character = await this.characterService.getCharacterById(this.characterId);
        const location = await this.locationService.getLocationById(character.location.locationId);
        const exit = location.exits.find(e => e.base_item_id === exitId);
        if (!exit) {
            throw new Error("Exit not found");
        }
        const exitEntity: Exit = await this.exitService.getById(exitId);
        character.ownerId = exitEntity.destinationId;
        await this.characterService.updateCharacterLocation(this.characterId, exitEntity.destinationId);      
    }

    public async pickUp(itemId: string, secondaryTarget?: string): Promise<void> {
        await initialiseDatabase();
        const character = await this.characterService.getCharacterById(this.characterId);
        if (secondaryTarget) {
            // Get the item from the secondary target
            // Check that the character owns the secondary target
            const secondaryTargetEntity = await this.locationService.getLocationById(secondaryTarget);
            if (secondaryTargetEntity.ownerId !== character.character_id) {
                throw new Error("Not the owner");
            }
            const item = await this.itemService.getItemById(secondaryTarget);
            if (!item) {
                throw new Error("Item not found");
            }
            item.ownerId = character.character_id;
            await this.itemService.updateItem(secondaryTarget, item);
        }
        const itemPresent = character.location.containedItems.find(i => i.base_item_id === itemId);
        if (!itemPresent) {
            throw new Error("Item not found");
        }
        const item = await this.itemService.getItemById(itemId);
        item.ownerId = character.character_id;
        await this.itemService.updateItem(itemId, item);
    }

    public async drop(itemId: string): Promise<void> {
        await initialiseDatabase();
        const character: Character = await this.characterService.getCharacterById(this.characterId);
        const itemOwned = character.containedItems.find(i => i.base_item_id === itemId);
        if (!itemOwned) {
            throw new Error("Item not found");
        }
        const item = itemOwned.toDto();
        item.ownerId = character.location.locationId;
        await this.itemService.updateItem(itemId, item);
    }

    public async look(id?: string): Promise<string[]> {
        const result: string[] = [];
        await initialiseDatabase();
        const character: Character = await this.characterService.getCharacterById(this.characterId);
        const location = await this.locationService.getLocationById(character.location.locationId);
        if (id) {
            const baseItem = await this.itemService.getItemById(id);
            // If the item is not the character's owner, or in their location or in their inventory, throw an error
            if (baseItem.ownerId !== character.character_id || baseItem.ownerId !== character.location.locationId || character.containedItems.find(i => i.base_item_id === id)) {
                throw new Error("Item not found");
            }
            result.push(baseItem.longDescription);
            return result;
        }
        // Generic look command. Describe the character's location and the items in it
        result.push(location.longDescription);
        location.containedItems.forEach(i => {
            result.push(i.longDescription);
        });
        return result;
    }
}
