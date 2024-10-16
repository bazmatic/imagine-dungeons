import dotenv from "dotenv";
import { Repository, Raw } from "typeorm";
import { AppDataSource } from "@/data-source";
import { GameEvent } from "@/entity/GameEvent";
import { COMMAND_TYPE } from "@/types/Tools";
dotenv.config();

export class GameEventService {
    private gameEventRepository: Repository<GameEvent>;

    constructor() {
        this.gameEventRepository = AppDataSource.getRepository(GameEvent);
    }

    public async makeGameEvent(
        agentId: string | null,
        locationId: string | null,
        inputText: string | undefined,
        commandType: COMMAND_TYPE,
        commandArguments: string,
        outputText: string | undefined,
        agentsPresent: string[]
    ): Promise<GameEvent> {
        const gameEvent = new GameEvent();
        gameEvent.agent_id = agentId ?? undefined;
        gameEvent.location_id = locationId ?? undefined;
        gameEvent.input_text = inputText;
        gameEvent.command_type = commandType;
        gameEvent.command_arguments = commandArguments;
        gameEvent.output_text = outputText;
        gameEvent.agents_present = agentsPresent;
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
