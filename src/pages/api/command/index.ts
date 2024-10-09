// Accept a text input from the user and return a response

import { Command } from "@/entity/Command";
import { initialiseDatabase } from "@/index";
import { AgentService } from "@/services/Agent.service";
import { CommandService } from "@/services/Command.service";
import { Interpreter } from "@/services/Interpreter";
import { WorldService } from "@/services/World.service";
import { NextApiRequest, NextApiResponse } from "next";

export default async function command(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const { agentId, command } = req.body;
    await initialiseDatabase();
    const interpreter = new Interpreter();
    const worldService = new WorldService();
    const agentService = new AgentService();

    try {
        const agent = await agentService.getAgentById(agentId);
        const commandResponse: Command[] = await interpreter.interpret(
            agentId,
            command
        );
        const textOutput = [];
        for (const command of commandResponse) {
            const descriptions = await interpreter.describeCommandResult(
                agent,
                command,
                false
            );
            for (const description of descriptions) {
                console.log(description);
                textOutput.push(description);
            }
        }

        worldService
            .autonomousAgentsAct()
            .then(async autonomousAgentResults => {
                if (autonomousAgentResults.length > 0) {
                    console.log("Autonomous agent actions:");
                    for (const command of autonomousAgentResults) {
                        const description =
                            await interpreter.describeCommandResult(
                                agent,
                                command,
                                true
                            );
                        console.log(description);
                    }
                }
            });

        
        res.status(200).json(textOutput);
    } catch (error) {
        console.warn(`Error in autonomous agent actions: ${error}`);
    }
}
