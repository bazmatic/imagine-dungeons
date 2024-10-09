import dotenv from "dotenv";
import { Repository, Raw } from "typeorm";
import { AppDataSource } from "@/data-source";
import { Command } from "@/entity/Command";
import { COMMAND_TYPE } from "./Interpreter";
dotenv.config();

export class CommandService {
    private commandRepository: Repository<Command>;

    constructor() {
        this.commandRepository = AppDataSource.getRepository(Command);
    }

    public async makeAgentCommand(
        agentId: string,
        inputText: string | undefined,
        commandType: COMMAND_TYPE,
        commandArguments: string,
        outputText: string | undefined,
        agentsPresent: string[]
        //rawResponse: OpenAI.Chat.Completions.ChatCompletionMessage | undefined
    ): Promise<Command> {
        const command = new Command();
        command.agent_id = agentId;
        command.input_text = inputText;
        command.command_type = commandType;
        command.command_arguments = commandArguments;
        command.output_text = outputText;
        command.agents_present = agentsPresent;
        return command;
        //await this.commandRepository.save(command);
    }

    public async saveAgentCommand(command: Command): Promise<void> {
        await this.commandRepository.save(command);
    }

    public async getRecentCommands(
        agentId: string,
        count: number
    ): Promise<Command[]> {
        return this.commandRepository.find({
            where: {
                agents_present: Raw(alias => `${alias} @> :agentId`, { agentId: JSON.stringify([agentId]) })
            },
            order: {
                created_at: "ASC"
            },
            take: count
        });
    }
}
