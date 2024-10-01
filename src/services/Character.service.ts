import { Character } from "@/entity/Character";
import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";

export class CharacterService {
    private characterRepository: Repository<Character>;

    constructor() {
        this.characterRepository = AppDataSource.getRepository(Character);
    }
    
    async getAllCharacters(): Promise<Character[]> {
        return this.characterRepository.find({
            relations: ["baseItem", "location"]
        });
    }

    async getCharacterById(id: string): Promise<Character | undefined> {
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

    async updateCharacter(
        id: string,
        characterData: Partial<Character>
    ): Promise<Character | undefined> {
        await this.characterRepository.update(id, characterData);
        return this.getCharacterById(id);
    }
}
