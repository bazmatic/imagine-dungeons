// Accept a text input from the user and return a response

import { GameEvent } from "@/entity/GameEvent";
import { initialiseDatabase } from "@/index";
import { GameEventService } from "@/services/GameEventService";
import { COMMAND_TYPE, Interpreter } from "@/services/Interpreter";
import { WorldService } from "@/services/World.service";
import { NextApiRequest, NextApiResponse } from "next";

export default async function command(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await initialiseDatabase();

    const { agentId, command } = req.body;
    const interpreter = new Interpreter();
    const worldService = new WorldService();

    try {
        //const agent = await agentService.getAgentById(agentId);
        const commandResponse: GameEvent[] = await interpreter.interpret(
            agentId,
            command
        );
        // Save all commands to the database
        const gameEventService = new GameEventService();
        for (const gameEvent of commandResponse) {
            await gameEventService.saveGameEvent(gameEvent);
        }
        //const textOutput = [];

        const autonomousAgentResults = await worldService.autonomousAgentsAct();
        // Save all autonomous agent results to the database
        for (const gameEvent of autonomousAgentResults) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        const combinedResults = [...commandResponse, ...autonomousAgentResults];
        const dtoResults: GameEventDTO[] = await Promise.all(combinedResults.map(async (gameEvent) => {
            const descriptions: string[] = await interpreter.describeCommandResult(
                agentId,
                gameEvent,
                false
            );
            return GameEventDTO.fromGameEvent(gameEvent, descriptions);
        }));

        res.status(200).json(dtoResults);
    } catch (error) {
        console.warn(`Error in autonomous agent actions: ${error}`);
        res.status(500).json({ error });
    }
}

export class GameEventDTO {
    public agent_id: string;
    public input_text?: string;
    public command_type: COMMAND_TYPE;
    public command_arguments: Record<string, unknown>;
    public description: string[];
    static fromGameEvent(gameEvent: GameEvent, description: string[]): GameEventDTO {
        const { agent_id, input_text, command_type } = gameEvent;
        const command_arguments = gameEvent.arguments;
        return {
            agent_id,
            input_text,
            command_type,
            command_arguments,
            description
        }
    }
}
