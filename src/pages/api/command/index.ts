// Accept a text input from the user and return a response

import { GameEvent } from "@/entity/GameEvent";
import { initialiseDatabase } from "@/index";
import { GameEventService } from "@/services/GameEventService";
import { COMMAND_TYPE, EventDescription, Interpreter } from "@/services/Interpreter";
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
        const commandResponse: GameEvent[] = await interpreter.interpret(
            agentId,
            command
        );
        // Save all commands to the database
        const gameEventService = new GameEventService();
        for (const gameEvent of commandResponse) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        const autonomousAgentResults = await worldService.autonomousAgentsAct();
        // Save all autonomous agent results to the database
        for (const gameEvent of autonomousAgentResults) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        // Combine the results from the user command and autonomous agents
        const combinedResults = [...commandResponse, ...autonomousAgentResults];

        // Process each game event
        const processedEvents = await Promise.all(combinedResults.map(async (gameEvent) => {
            // Get the event description
            const eventDescription: EventDescription | null = await interpreter.describeCommandResult(
                agentId,
                gameEvent,
                false
            );

            // Check if the event description is valid
            if (!eventDescription?.primary_text) {
                console.warn(`No primary text for game event: ${JSON.stringify(gameEvent)}`);
                return null;
            }

            // Convert the game event to DTO
            return GameEventDTO.fromGameEvent(
                gameEvent, 
                eventDescription.primary_text, 
                eventDescription.extra_text
            );
        }));

        // Filter out null results and cast to GameEventDTO[]
        const dtoResults: GameEventDTO[] = processedEvents.filter((dto): dto is GameEventDTO => dto !== null);

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
    public primary_text: string;
    public extra_text?: string[];
    static fromGameEvent(gameEvent: GameEvent, primary_text: string, extra_text?: string[]): GameEventDTO {
        const { agent_id, input_text, command_type } = gameEvent;
        const command_arguments = gameEvent.arguments;
        return {
            agent_id,
            input_text,
            command_type,
            command_arguments,
            primary_text,
            extra_text,
        }
    }
}
