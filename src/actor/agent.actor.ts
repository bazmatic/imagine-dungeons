import dotenv from "dotenv";
import { Agent } from "@/entity/Agent";
import { AgentService } from "@/services/Agent.service";
import { OpenAI } from "openai";
import { GameEventService } from "@/services/GameEventService";
import { Referee } from "@/services/Referee";
import { GameEvent } from "@/entity/GameEvent";
import { OpenAiHelper } from "@/services/Ai/OpenAi";
import { getAiHelper, IAiHelper } from "@/services/Ai/Ai";


dotenv.config();

/*
This represents an autonomous agent (NPC) in the game.
The `act` method decides what to do and then the instructions are sent to the referee to be executed.
*/

export class AgentActor {
    private agentService: AgentService;
    private gameEventService: GameEventService;
    private referee: Referee;
    private aiHelper: IAiHelper;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
        this.referee = new Referee();
        this.aiHelper = getAiHelper();
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
    }

    // Decide what to do and do it. Return the commands that were issued.
    public async act(): Promise<GameEvent[]> {
        //=== Get the context
        const agent: Agent = await this.agent();
        if (await agent.isDead()) {
            return [];
        }

        const instructions: string = await this.aiHelper.agentMakesInstructions(agent);
        const gameEvents: GameEvent[] = await this.referee.acceptAgentInstructions(
            this.agentId,
            instructions
        );

        return gameEvents;
    }
}
