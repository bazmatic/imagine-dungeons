// Accept a text input from the user and return a response

import { GameEvent } from "@/entity/GameEvent";
import { initialiseDatabase } from "@/index";
import { GameEventService } from "@/services/GameEventService";
import { Interpreter } from "@/services/Interpreter";
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
        const textOutput = [];

        const autonomousAgentResults = await worldService.autonomousAgentsAct();
        // Save all autonomous agent results to the database
        for (const gameEvent of autonomousAgentResults) {
            await gameEventService.saveGameEvent(gameEvent);
        }

        const combinedResults = [...commandResponse, ...autonomousAgentResults];

        for (const gameEvent of combinedResults) {
            const descriptions = await interpreter.describeCommandResult(
                agentId,
                gameEvent,
                false
            );
            for (const description of descriptions) {
                console.log(description);
                textOutput.push(description);
            }
        }
        res.status(200).json(textOutput);
    } catch (error) {
        console.warn(`Error in autonomous agent actions: ${error}`);
        res.status(500).json({ error });
    }
}
