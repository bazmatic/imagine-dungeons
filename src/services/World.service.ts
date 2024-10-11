import { AgentActor } from "@/actor/agent.actor";
import { AgentService } from "./Agent.service";
import { GameEvent } from "@/entity/GameEvent";
import { GameEventService } from "./GameEventService";

export class WorldService {
    private agentService: AgentService;
    private gameEventService: GameEventService;

    constructor() {
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
    }
    public async autonomousAgentsAct(): Promise<GameEvent[]> {
        // For each agent with autonomous = true and activated = true
        let combinedGameEvents: GameEvent[] = [];
        const agents = await this.agentService.getActiveAutonomousAgents();
        const agentActions = agents.map(async (agent) => {
            const agentActor = new AgentActor(agent.agentId);
            const gameEvents: GameEvent[] = await agentActor.act();
            await Promise.all(gameEvents.map(gameEvent => this.gameEventService.saveGameEvent(gameEvent)));
            return gameEvents;
        });

        const allGameEvents = await Promise.all(agentActions);
        combinedGameEvents = allGameEvents.flat();
        return combinedGameEvents;
    }
}
