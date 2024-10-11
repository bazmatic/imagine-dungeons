import dotenv from "dotenv";
import { Repository, Raw } from "typeorm";
import { AppDataSource } from "@/data-source";
import { GameEvent } from "@/entity/GameEvent";
import { COMMAND_TYPE, PromptContext } from "./Interpreter";
dotenv.config();

export class GameEventService {
    private gameEventRepository: Repository<GameEvent>;

    constructor() {
        this.gameEventRepository = AppDataSource.getRepository(GameEvent);
    }

    public async makeGameEvent(
        agentId: string,
        inputText: string | undefined,
        commandType: COMMAND_TYPE,
        commandArguments: string,
        outputText: string | undefined,
        context: PromptContext
    ): Promise<GameEvent> {
        const gameEvent = new GameEvent();
        gameEvent.agent_id = agentId;
        gameEvent.input_text = inputText;
        gameEvent.command_type = commandType;
        gameEvent.command_arguments = commandArguments;
        gameEvent.output_text = outputText;
        gameEvent.agents_present = context.agents_present.map(agent => agent.agent_id);
        return gameEvent;
    }

    public async saveGameEvent(gameEvent: GameEvent): Promise<void> {
        await this.gameEventRepository.save(gameEvent);
    }

    public async getRecentGameEvents(
        agentId: string,
        count: number
    ): Promise<GameEvent[]> {
       const records = await  this.gameEventRepository.find({
            where: {
                agents_present: Raw(alias => `${alias} @> :agentId`, { agentId: JSON.stringify([agentId]) })
            },
            order: {
                created_at: "DESC"
            },
            take: count
        });
        return records.reverse();
    }
}
