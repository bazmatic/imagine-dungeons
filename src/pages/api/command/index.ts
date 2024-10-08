// Accept a text input from the user and return a response

import { CommandService } from "@/services/Command.service";
import { WorldService } from "@/services/World.service";
import { NextApiRequest, NextApiResponse } from "next";

export default async function command(req: NextApiRequest, res: NextApiResponse) {
    const { agentId, command } = req.body;
    const commandService = new CommandService();
    const commandResponse = await commandService.issueCommand(agentId, command);
    const worldService = new WorldService();
    try {
        const autonomousAgentResults: string[] = await worldService.autonomousAgentsAct();
        console.log(`Autonomous agent actions: ${JSON.stringify(autonomousAgentResults, null, 4)}`);
         //.concat(autonomousAgentResults));
    } catch (error) {
        console.warn(`Error in autonomous agent actions: ${error}`);
    }
    res.status(200).json(commandResponse);
}