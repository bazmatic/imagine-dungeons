import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";
import { Exit } from "@/entity/Exit";
export class ExitService {
    private exitRepository: Repository<Exit>;

    constructor() {
        this.exitRepository = AppDataSource.getRepository(Exit);
    }
    
    async getAllItems(): Promise<Exit[]> {
        return this.exitRepository.find({
            relations: ["location"]
        });
    }

    async getById(id: string): Promise<Exit> {
        return this.exitRepository.findOneOrFail({
            where: { exit_id: id },
            relations: ["location"]
        });
    }

    async createItem(
        itemData: Partial<Exit>
    ): Promise<Exit> {
        const exit = this.exitRepository.create(itemData);
        return this.exitRepository.save(exit);
    }

    async updateItem(
        id: string,
        itemData: Partial<Exit>
    ): Promise<Exit> {
        await this.exitRepository.update(id, itemData);
        return this.getById(id);
    }

    async deleteItem(id: string): Promise<void> {
        await this.exitRepository.delete(id);
    }
}
