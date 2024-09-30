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
            relations: ["base_item", "inventory", "location"]
        });
    }

    async getCharacterById(id: number): Promise<Character | undefined> {
        return this.characterRepository.findOneOrFail({
            where: { character_id: id },
            relations: ["base_item", "inventory", "location"]
        });
    }

    async createCharacter(
        characterData: Partial<Character>
    ): Promise<Character> {
        const character = this.characterRepository.create(characterData);
        return this.characterRepository.save(character);
    }

    async updateCharacter(
        id: number,
        characterData: Partial<Character>
    ): Promise<Character | undefined> {
        await this.characterRepository.update(id, characterData);
        return this.getCharacterById(id);
    }

    async deleteCharacter(id: number): Promise<void> {
        await this.characterRepository.delete(id);
    }
}
