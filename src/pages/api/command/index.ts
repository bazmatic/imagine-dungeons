// Accept a text input from the user and return a response

import { CommandService } from "@/services/Command.service";
import { NextApiRequest, NextApiResponse } from "next";

export default async function command(req: NextApiRequest, res: NextApiResponse) {
    const { agentId, command } = req.body;
    const commandService = new CommandService();
    const response = await commandService.parse(agentId, command);
    res.status(200).json(response);
}
