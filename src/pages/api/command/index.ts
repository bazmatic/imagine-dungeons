// Accept a text input from the user and return a response

import { Command } from "@/entity/Command";
import { initialiseDatabase } from "@/index";
import { CommandService } from "@/services/Command.service";
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
        const commandResponse: Command[] = await interpreter.interpret(
            agentId,
            command
        );
        // Save all commands to the database
        const commandService = new CommandService();
        for (const command of commandResponse) {
            await commandService.saveAgentCommand(command);
        }
        const textOutput = [];

        const autonomousAgentResults = await worldService.autonomousAgentsAct();
        // Save all autonomous agent results to the database
        for (const command of autonomousAgentResults) {
            await commandService.saveAgentCommand(command);
        }

        const combinedResults = [...commandResponse, ...autonomousAgentResults];

        for (const command of combinedResults) {
            const descriptions = await interpreter.describeCommandResult(
                agentId,
                command,
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
