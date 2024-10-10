import { AppDataSource } from "@/data-source";
import { Repository } from "typeorm";
import { Agent } from "@/entity/Agent";

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
}
