
import { AgentService } from "./Agent.service";
import { GameEvent } from "@/entity/GameEvent";
import { GameEventService } from "./GameEventService";
import { Referee } from "./Referee";
import { AgentActor } from "@/actor/agent.actor";

export class WorldService {
    private agentService: AgentService;
    private gameEventService: GameEventService;
    private referee: Referee;

    constructor() {
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
        this.referee = new Referee();
    }
    public async autonomousAgentsAct(): Promise<GameEvent[]> {
        // For each agent with autonomous = true and activated = true
        let combinedGameEvents: GameEvent[] = [];
        const agents = await this.agentService.getActiveAutonomousAgents();
        const agentActions = agents.map(async (agent) => {
            const agentActor = new AgentActor(agent.agentId);
            const agentGameEvents: GameEvent[] = await agentActor.act();
            const consequentGameEvents: GameEvent[] = await this.referee.determineConsequentEvents(agentGameEvents);
            const gameEvents = [...agentGameEvents, ...consequentGameEvents];

            await Promise.all(gameEvents.map(gameEvent => this.gameEventService.saveGameEvent(gameEvent)));
            return gameEvents;
        });

        const allGameEvents = await Promise.all(agentActions);
        combinedGameEvents = allGameEvents.flat();
        return combinedGameEvents;
    }
}
