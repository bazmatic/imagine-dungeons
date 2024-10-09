import { AgentActor } from "@/actor/agent.actor";
import { AgentService } from "./Agent.service";
import { Command } from "@/entity/Command";
import { CommandService } from "./Command.service";

export class WorldService {
    private agentService: AgentService;
    private commandService: CommandService;

    constructor() {
        this.agentService = new AgentService();
        this.commandService = new CommandService();
    }
    public async autonomousAgentsAct(): Promise<Command[]> {
        // For each agent with autonomous = true and activated = true
        let combinedCommands: Command[] = [];
        const agents = await this.agentService.getActiveAutonomousAgents();
        for (const agent of agents) {
            const agentActor = new AgentActor(agent.agentId);
            const commands: Command[] = await agentActor.act();
            combinedCommands = combinedCommands.concat(commands);
            for (const command of commands) {
                await this.commandService.saveAgentCommand(command);
            }
            //await this.agentService.activateAutonomy(agent.agentId, false);
        }
        return combinedCommands;
    }
}
