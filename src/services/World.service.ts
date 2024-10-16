import { AgentActor } from "@/actor/agent.actor";
import { AgentService } from "./Agent.service";
import { GameEvent } from "@/entity/GameEvent";
import { GameEventService } from "./GameEventService";
import { Interpreter } from "./Interpreter";

export class WorldService {
    private agentService: AgentService;
    private gameEventService: GameEventService;
    private interpreter: Interpreter;

    constructor() {
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
        this.interpreter = new Interpreter();
    }
    public async autonomousAgentsAct(): Promise<GameEvent[]> {
        // For each agent with autonomous = true and activated = true
        let combinedGameEvents: GameEvent[] = [];
        const agents = await this.agentService.getActiveAutonomousAgents();
        const agentActions = agents.map(async (agent) => {
            const agentActor = new AgentActor(agent.agentId);
            const agentGameEvents: GameEvent[] = await agentActor.act();
            const consequentGameEvents: GameEvent[] = []; //await this.interpreter.determineConsequentEvents(agentGameEvents);
            const gameEvents = [...agentGameEvents, ...consequentGameEvents];

            await Promise.all(gameEvents.map(gameEvent => this.gameEventService.saveGameEvent(gameEvent)));
            return gameEvents;
        });

        const allGameEvents = await Promise.all(agentActions);
        combinedGameEvents = allGameEvents.flat();
        return combinedGameEvents;
    }
}
