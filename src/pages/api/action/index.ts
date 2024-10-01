import { CharacterActor } from "@/actor/character.actor";
import { GameObjectKind } from "@/entity/BaseItem";
import { initialiseDatabase } from "@/index";
import { BaseItemService } from "@/services/BaseItem.service";
import { NextApiRequest, NextApiResponse } from "next";

export class ActionDTO {
    actorId: string;
    action: ActionType;
    primaryTarget?: string;
    secondaryTarget?: string;
}

export enum ActionType {
    GO = "go",
    PICK_UP = "pick_up",
    DROP = "drop",
    LOOK = "look"
}


// Receive a POST ActionDTO and execute the action

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    await initialiseDatabase();
    const actionDTO = req.body as ActionDTO;
    const { actorId, action, primaryTarget, secondaryTarget } = actionDTO;
    if (!actorId || !action) {
        throw new Error("actorId and action are required");
    }
    
    const baseItemService = new BaseItemService();
    const actor = await baseItemService.getBaseItemById(actorId);
    if (actor.kind !== GameObjectKind.CHARACTER) {
        throw new Error("Actor is not a character");
    }
    let text: string[] = [];

    const characterActor = new CharacterActor(actorId);
    switch (action) {
        case ActionType.GO:
            if (!primaryTarget) {
                throw new Error("Missing exit id");
            }
            await characterActor.go(primaryTarget);
            break;
        case ActionType.PICK_UP:
            if (!primaryTarget) {
                throw new Error("Missing item id");
            }
            await characterActor.pickUp(primaryTarget, secondaryTarget);
            break;
        case ActionType.DROP:
            if (!primaryTarget) {
                throw new Error("Missing item id");
            }
            await characterActor.drop(primaryTarget);
            break;
        case ActionType.LOOK:
            text = await characterActor.look(primaryTarget);
            break;
        default:
            throw new Error("Invalid action type");

    }
    res.status(200).json({ success: true, text });
}