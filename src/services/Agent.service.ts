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
            //relations: ["items"] // TODO: This causes an error
        });
        return result;
    }

    async createAgent(agentData: Partial<Agent>): Promise<Agent> {
        const agent = this.agentRepository.create(agentData);
        return this.agentRepository.save(agent);
    }

    async updateAgentLocation(id: string, locationId: string): Promise<Agent> {
        await this.agentRepository.update(id, { ownerId: locationId });
        return this.getAgentById(id);
    }
}
