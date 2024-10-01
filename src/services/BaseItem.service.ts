import { BaseItem } from "@/entity/BaseItem";
import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";

export class BaseItemService {
    private baseItemRepository: Repository<BaseItem>;

    constructor() {
        this.baseItemRepository = AppDataSource.getRepository(BaseItem);
    }
    
    async getAllBaseItems(): Promise<BaseItem[]> {
        return this.baseItemRepository.find();
    }

    async getBaseItemById(id: string): Promise<BaseItem> {
        return this.baseItemRepository.findOneOrFail({
            where: { base_item_id: id }
        });
    }

    async createBaseItem(
        baseItemData: Partial<BaseItem>
    ): Promise<BaseItem> {
        const baseItem = this.baseItemRepository.create(baseItemData);
        return this.baseItemRepository.save(baseItem);
    }

    async updateBaseItem(
        id: string,
        baseItemData: Partial<BaseItem>
    ): Promise<BaseItem | undefined> {
        await this.baseItemRepository.update(id, baseItemData);
        return this.getBaseItemById(id);
    }
}
