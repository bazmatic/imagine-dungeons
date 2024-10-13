import { Item } from "@/entity/Item";
import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";

export class ItemService {
    private itemRepository: Repository<Item>;

    constructor() {
        this.itemRepository = AppDataSource.getRepository(Item);
    }
    
    async getAllItems(): Promise<Item[]> {
        return this.itemRepository.find({
            relations: ["items"]
        });
    }

    async getItemById(id: string): Promise<Item> {
        return this.itemRepository.findOneOrFail({
            where: { itemId: id },
            relations: ["items"]
        });
    }

    async createItem(
        itemData: Partial<Item>
    ): Promise<Item> {
        const item = this.itemRepository.create(itemData);
        return this.itemRepository.save(item);
    }

    async setOwnerToAgent(itemId: string, ownerId: string): Promise<void> {
        await this.itemRepository.update(itemId, {
             ownerAgentId: ownerId,
             ownerItemId: null,
             ownerLocationId: null
        });
    }

    async setOwnerToLocation(itemId: string, ownerId: string): Promise<void> {
        await this.itemRepository.update(itemId, {
             ownerAgentId: null,
             ownerItemId: null,
             ownerLocationId: ownerId
        });
    }

    async setOwnerToItem(itemId: string, ownerId: string): Promise<void> {
        await this.itemRepository.update(itemId, {
             ownerAgentId: null,
             ownerItemId: ownerId,
             ownerLocationId: null
        });
    }

    async deleteItem(id: string): Promise<void> {
        await this.itemRepository.delete(id);
    }

    async revealItem(itemId: string): Promise<void> {
       await this.itemRepository.update(itemId, {
        hidden: false
       });
    }

    async updateItemDescription(itemId: string, description: string): Promise<void> {
        await this.itemRepository.update(itemId, {
            longDescription: description
        });
    }
}
