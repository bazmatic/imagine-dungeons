// Accept a text input from the user and return a response

import { CommandService } from "@/services/Command.service";
import { WorldService } from "@/services/World.service";
import { NextApiRequest, NextApiResponse } from "next";

export default async function command(req: NextApiRequest, res: NextApiResponse) {
    const { agentId, command } = req.body;
    const commandService = new CommandService();
    const commandResponse = await commandService.issueCommand(agentId, command);
    const worldService = new WorldService();
    const autonomousAgentResults = await worldService.autonomousAgentsAct();
    res.status(200).json(commandResponse.concat(autonomousAgentResults));
}