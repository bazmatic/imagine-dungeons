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
            relations: ["base_item"] //, "base_item.inventory"]
        });
    }

    async getItemById(id: number): Promise<Item | undefined> {
        return this.itemRepository.findOneOrFail({
            where: { item_id: id },
            relations: ["base_item", "base_item.inventory"]
        });
    }

    async createItem(
        itemData: Partial<Item>
    ): Promise<Item> {
        const item = this.itemRepository.create(itemData);
        return this.itemRepository.save(item);
    }

    async updateItem(
        id: number,
        itemData: Partial<Item>
    ): Promise<Item | undefined> {
        await this.itemRepository.update(id, itemData);
        return this.getItemById(id);
    }

    async deleteItem(id: number): Promise<void> {
        await this.itemRepository.delete(id);
    }
}
