import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";
import { Agent } from "@/entity/Agent";
import { CreatureTemplateService } from "@/services/CreatureTemplate.service";
import { generateId } from "@/utils/strings";

export class AgentService {
    private agentRepository: Repository<Agent>;
    constructor() {
        this.agentRepository = AppDataSource.getRepository(Agent);
    }

    async getAllAgents(): Promise<Agent[]> {
        return this.agentRepository.find({
            relations: ["items"]
        });
    }

    async getAgentById(id: string): Promise<Agent> {
        const result = await this.agentRepository.findOneOrFail({
            where: { agentId: id },
            relations: ["items"] //TODO: This causes an error
        });
        return result;
    }

    async getAgentsByLocation(locationId: string): Promise<Agent[]> {
        return this.agentRepository.find({
            where: { ownerLocationId: locationId }
        });
    }

    async createAgent(agentData: Partial<Agent>): Promise<Agent> {
        const agent = this.agentRepository.create(agentData);
        return this.agentRepository.save(agent);
    }

    async updateAgentLocation(id: string, locationId: string): Promise<Agent> {
        await this.agentRepository.update(id, { ownerLocationId: locationId });
        return this.getAgentById(id);
    }

    async updateAgentGoal(id: string, goal: string): Promise<Agent> {
        await this.agentRepository.update(id, { goal: goal });
        return this.getAgentById(id);
    }

    async updateAgentHealth(id: string, delta: number): Promise<Agent> {
        const agent = await this.getAgentById(id);
        await this.agentRepository.update(id, { health: agent.health + delta });
        return this.getAgentById(id);
    }

    async updateAgentMood(id: string, mood: string): Promise<Agent> {
        await this.agentRepository.update(id, { mood: mood });
        return this.getAgentById(id);
    }

    async activateAutonomy(id: string, activate: boolean): Promise<Agent> {
        await this.agentRepository.update(id, { activated: activate });
        return this.getAgentById(id);
    }

    async getActiveAutonomousAgents(): Promise<Agent[]> {
        return this.agentRepository.find({
            where: { autonomous: true, activated: true }
        });
    }

    async updateAgentIntent(id: string, intent: string): Promise<Agent> {
        await this.agentRepository.update(id, { currentIntent: intent });
        return this.getAgentById(id);
    }

    async updateAgentDefence(id: string, defence: number): Promise<Agent> {
        await this.agentRepository.update(id, { defence: defence });
        return this.getAgentById(id);
    }

    async spawnAgentFromTemplate(templateId: string, locationId: string, name: string): Promise<Agent> {
        const creatureTemplateService = new CreatureTemplateService();
        const template = await creatureTemplateService.getTemplateById(templateId);

        const newAgentData: Partial<Agent> = {
            agentId: `char_${generateId()}`, // Generate a unique ID
            label: name,
            shortDescription: template.shortDescription,
            longDescription: template.longDescription,
            ownerLocationId: locationId,
            capacity: template.capacity,
            health: template.health,
            damage: template.damage,
            defence: template.defence,
            backstory: template.backstory,
            mood: template.mood,
            notes: template.notes,
            autonomous: true,
            activated: true
        };

        return this.createAgent(newAgentData);
    }
}
