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
            //relations: ["items"]
        });
    }

    async getItemById(id: string): Promise<Item> {
        return this.itemRepository.findOneOrFail({
            where: { itemId: id },
            //relations: ["items"]
        });
    }

    async createItem(
        itemData: Partial<Item>
    ): Promise<Item> {
        const item = this.itemRepository.create(itemData);
        return this.itemRepository.save(item);
    }

    async updateItem(
        id: string,
        itemData: Partial<Item>
    ): Promise<Item | undefined> {
        await this.itemRepository.update(id, itemData);
        return this.getItemById(id);
    }

    async deleteItem(id: string): Promise<void> {
        await this.itemRepository.delete(id);
    }
}
