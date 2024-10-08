import { AgentActor } from "@/actor/agent.actor";
import { AgentService } from "./Agent.service";

export class WorldService {
    private agentService: AgentService;

    constructor() {
        this.agentService = new AgentService();

    }
    public async autonomousAgentsAct(): Promise<string[]> {
        // For each agent with autonomous = true and activated = true
        const agents = await this.agentService.getActiveAutonomousAgents();
        let agentResults: string[] = [];
        for (const agent of agents) {
            const agentActor = new AgentActor(agent.agentId);
            const agentResult: string[] = await agentActor.act();
            await this.agentService.activateAutonomy(agent.agentId, false);
            agentResults = agentResults.concat(agentResult);         
        }
        return agentResults;
    }
}