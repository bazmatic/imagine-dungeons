import { Character } from "@/entity/Character";
import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";
import { BaseItem } from "@/entity/BaseItem";

export class CharacterService {
    private characterRepository: Repository<Character>;
    private baseItemRepository: Repository<BaseItem>;
    constructor() {
        this.characterRepository = AppDataSource.getRepository(Character);
        this.baseItemRepository = AppDataSource.getRepository(BaseItem);
    }
    
    async getAllCharacters(): Promise<Character[]> {
        return this.characterRepository.find({
            relations: ["baseItem", "location"]
        });
    }

    async getCharacterById(id: string): Promise<Character> {
        return this.characterRepository.findOneOrFail({
            where: { character_id: id },
            relations: ["baseItem", "location"]
        });
    }

    async createCharacter(
        characterData: Partial<Character>
    ): Promise<Character> {
        const character = this.characterRepository.create(characterData);
        return this.characterRepository.save(character);
    }

    async updateCharacterLocation(
        id: string,
        locationId: string
    ): Promise<Character> {

        await this.baseItemRepository.update(id, { ownerId: locationId });
        return this.getCharacterById(id);
    }
}
