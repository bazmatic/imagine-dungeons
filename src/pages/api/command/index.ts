// Accept a text input from the user and return a response

import { Agent } from "@/entity/Agent";
import { GameEvent } from "@/entity/GameEvent";
import { AgentService } from "@/services/Agent.service";
import { initialiseDatabase } from "@/index";
import { GameEventService } from "@/services/GameEventService";
import { WorldService } from "@/services/World.service";
import { EventDescription } from "@/types/types";
import { NextApiRequest, NextApiResponse } from "next";
import { Referee } from "@/services/Referee";
import { COMMAND_TYPE } from "@/types/commands";

export default async function command(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await initialiseDatabase();

    const { agentId, command } = req.body;
    const referee = new Referee();
    const worldService = new WorldService();
    const agentService = new AgentService();
    try {
        const observerAgent = await agentService.getAgentById(agentId);
        const directUserGameEvents: GameEvent[] = await referee.acceptAgentInstructions(
            agentId,
            command
        );
 
        //const combinedUserGameEvents = [...directUserGameEvents, ...consequentUserGameEvents];

        // Save all events to the database so that they can be seen by other agents and the referee
        const gameEventService = new GameEventService();
        for (const gameEvent of directUserGameEvents) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        // === Autonomous agents act ===
        // This may change to running on their own thread in the future
        const autonomousAgentGameEvents: GameEvent[] = await worldService.autonomousAgentsAct();
        // Save all autonomous agent results to the database
        for (const gameEvent of autonomousAgentGameEvents) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        const consequentUserGameEvents: GameEvent[] = await referee.determineConsequentEvents([...directUserGameEvents, ...autonomousAgentGameEvents]);
        for (const gameEvent of consequentUserGameEvents) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        // == Format the results ==
        // Combine the results 
        const combinedResults = [...directUserGameEvents, ...consequentUserGameEvents, ...autonomousAgentGameEvents];

        // Process each game event into a DTO
        const processedEvents: GameEventDTO[] = [];
        for (const gameEvent of combinedResults) {
            // Convert the game event to DTO
            const dto = await GameEventDTO.fromGameEvent(
                observerAgent,
                gameEvent
            );
            if (dto) {
                processedEvents.push(dto);
            }
        }

        // Filter out null results
        const dtoResults: GameEventDTO[] = processedEvents.filter((dto) => dto !== null);

        res.status(200).json(dtoResults);
    } catch (error) {
        console.warn(`Error in autonomous agent actions: ${error} ${error instanceof Error ? error.stack : ""}`);
        res.status(500).json({ error });
    }
}

export class GameEventDTO {
    public agent_id: string;
    public agent_name: string;
    public input_text?: string;
    public command_type: COMMAND_TYPE;
    public command_arguments: Record<string, unknown>;
    public general_description: string;
    public extra_detail?: string[];
    static async fromGameEvent(observerAgent: Agent, gameEvent: GameEvent): Promise<GameEventDTO | null> {
       

        // Get the event description
        const eventDescription: EventDescription | null = await gameEvent.describe(
            observerAgent
        );
        if (!eventDescription) {
            return null;
        }
            
        let agentName = "system";
        if (gameEvent.agent_id) {
            const agentService = new AgentService();
            const agent = await agentService.getAgentById(gameEvent.agent_id);
            agentName = agent.label;
        }

        const command_arguments = gameEvent.arguments;
    
        return {
            agent_id: gameEvent.agent_id ?? "system",
            agent_name: agentName,
            command_type: gameEvent.command_type,
            command_arguments,
            general_description: eventDescription?.general_description ?? "",
            extra_detail: eventDescription?.extra_detail ?? [],
        }
    }
}
