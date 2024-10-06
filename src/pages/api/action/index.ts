import { AgentActor } from "@/actor/agent.actor";
import { initialiseDatabase } from "@/index";
import { NextApiRequest, NextApiResponse } from "next";

export class ActionDTO {
    agentId: string;
    action: ActionType;
    primaryTarget?: string;
    secondaryTarget?: string;
}

export enum ActionType {
    GO_EXIT = "go_exit",
    PICK_UP_ITEM = "pick_up_item",
    DROP_ITEM = "drop_item",
    LOOK_AT_ITEM = "look_at_item",
    LOOK_AT_AGENT = "look_at_agent",
    LOOK_AT_LOCATION = "look_at_location",
    LOOK_AROUND = "look_around",
    LOOK_AT_EXIT = "look_at_exit"
}

// Receive a POST ActionDTO and execute the action

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await initialiseDatabase();
    const actionDTO = req.body as ActionDTO;
    const { agentId, action, primaryTarget, secondaryTarget } = actionDTO;
    if (!agentId || !action || !primaryTarget) {
        throw new Error("agentId, action and primaryTarget are required");
    }

    let result: string[] = [];

    const agentActor = new AgentActor(agentId);
    switch (action) {
        case ActionType.GO_EXIT:
            if (!primaryTarget) {
                throw new Error("Missing exit id");
            }
            await agentActor.goExit(primaryTarget);
            break;
        case ActionType.PICK_UP_ITEM:
            if (!primaryTarget) {
                throw new Error("Missing item id");
            }
            await agentActor.pickUp(primaryTarget, secondaryTarget);
            break;
        case ActionType.DROP_ITEM:
            if (!primaryTarget) {
                throw new Error("Missing item id");
            }
            await agentActor.dropItem(primaryTarget);
            break;
        case ActionType.LOOK_AT_ITEM:
            result = await agentActor.lookAtItem(primaryTarget);
            break;
        case ActionType.LOOK_AT_AGENT:
            result = await agentActor.lookAtAgent(primaryTarget);
            break;
        case ActionType.LOOK_AT_LOCATION:
            result = await agentActor.lookAtLocation(primaryTarget);
            break;
        case ActionType.LOOK_AROUND:
            result = await agentActor.lookAround();
            break;
        case ActionType.LOOK_AT_EXIT:
            result = await agentActor.lookAtExit(primaryTarget);
            break;
        default:
            throw new Error("Invalid action type");
    }
    res.status(200).json({ success: true, result });
}


// JSON schemas for these functions, so that OpenAI can call them
