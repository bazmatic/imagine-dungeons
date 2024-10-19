// src/services/CreatureTemplate.service.ts
import { Repository } from "typeorm";
import { AppDataSource } from "@/data-source";
import { CreatureTemplate } from "@/entity/CreatureTemplate";

export class CreatureTemplateService {
    private creatureTemplateRepository: Repository<CreatureTemplate>;

    constructor() {
        this.creatureTemplateRepository = AppDataSource.getRepository(CreatureTemplate);
    }

    async getTemplateById(id: string): Promise<CreatureTemplate> {
        return this.creatureTemplateRepository.findOneOrFail({ where: { templateId: id } });
    }

    async createTemplate(templateData: Partial<CreatureTemplate>): Promise<CreatureTemplate> {
        const template = this.creatureTemplateRepository.create(templateData);
        return this.creatureTemplateRepository.save(template);
    }
}

