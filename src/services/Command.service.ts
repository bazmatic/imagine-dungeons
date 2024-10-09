// Given a string, decide which action to take.
// Call the appropriate service method

import dotenv from "dotenv";
import { Repository } from "typeorm";
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
        outputText: string | undefined
        //rawResponse: OpenAI.Chat.Completions.ChatCompletionMessage | undefined
    ): Promise<Command> {
        const command = new Command();
        command.agent_id = agentId;
        command.input_text = inputText;
        command.command_type = commandType;
        command.command_arguments = commandArguments;
        command.output_text = outputText;
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
            where: { agent_id: agentId },
            order: { created_at: "DESC" },
            take: count
        });
    }
}
