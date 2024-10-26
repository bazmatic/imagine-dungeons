import { AiTool } from "./types";

export enum COMMAND_TYPE {
    ATTACK_AGENT = "attack_agent",
    DO_NOTHING = "do_nothing",
    DROP_ITEM = "drop_item",
    EMOTE = "emote",
    EVENT = "event",
    GET_INVENTORY = "get_inventory",
    GET_ITEM_FROM_ITEM = "get_item_from_item",
    GIVE_ITEM_TO_AGENT = "give_item_to_agent",
    GO_EXIT = "go_exit",
    LOOK_AROUND = "look_around",
    LOOK_AT_AGENT = "look_at_agent",
    LOOK_AT_EXIT = "look_at_exit",
    LOOK_AT_ITEM = "look_at_item",
    PICK_UP_ITEM = "pick_up_item",
    REVEAL_EXIT = "reveal_exit",
    REVEAL_ITEM = "reveal_item",
    SEARCH_EXIT = "search_exit",
    SEARCH_ITEM = "search_item",
    SEARCH_LOCATION = "search_location",
    SPAWN_AGENT = "spawn_agent",
    SPEAK_TO_AGENT = "speak_to_agent",
    UNLOCK_EXIT = "unlock_exit",
    UPDATE_AGENT_INTENT = "update_agent_intent",
    UPDATE_AGENT_MOOD = "update_agent_mood",
    UPDATE_ITEM_DESCRIPTION = "update_item_description",
    //USE_ITEM = "use_item",
    WAIT = "wait",
}

export type ToolCallArguments = {
    [COMMAND_TYPE.ATTACK_AGENT]: { target_agent_id: string };
    [COMMAND_TYPE.DROP_ITEM]: { item_id: string };
    [COMMAND_TYPE.DO_NOTHING]: object;
    [COMMAND_TYPE.EMOTE]: { emote_text: string; agent_id: string };
    [COMMAND_TYPE.EVENT]: { event_text: string };
    [COMMAND_TYPE.GET_INVENTORY]: object;
    [COMMAND_TYPE.GET_ITEM_FROM_ITEM]: { container_item_id: string; target_item_id: string };
    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: { item_id: string; target_agent_id: string };
    [COMMAND_TYPE.GO_EXIT]: { exit_id: string };
    [COMMAND_TYPE.LOOK_AROUND]: object;
    [COMMAND_TYPE.LOOK_AT_AGENT]: { agent_id: string };
    [COMMAND_TYPE.LOOK_AT_EXIT]: { exit_id: string };
    [COMMAND_TYPE.LOOK_AT_ITEM]: { item_id: string };
    [COMMAND_TYPE.PICK_UP_ITEM]: { item_id: string };
    [COMMAND_TYPE.REVEAL_EXIT]: { exit_id: string; reason: string };
    [COMMAND_TYPE.REVEAL_ITEM]: { item_id: string; reason: string };
    [COMMAND_TYPE.SEARCH_EXIT]: { exit_id: string };
    [COMMAND_TYPE.SEARCH_ITEM]: { item_id: string };
    [COMMAND_TYPE.SEARCH_LOCATION]: { location_id: string };
    [COMMAND_TYPE.SPAWN_AGENT]: { template_id: string; location_id: string; name: string };
    [COMMAND_TYPE.SPEAK_TO_AGENT]: { target_agent_id: string; message: string };
    [COMMAND_TYPE.UNLOCK_EXIT]: { exit_id: string; reason: string };
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: { intent: string; reason: string };
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: { mood: string; reason: string };
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: { item_id: string; description: string; reason: string };
    //[COMMAND_TYPE.USE_ITEM]: { object_type: string; object_id: string; item_id: string };
    [COMMAND_TYPE.WAIT]: object;
};
/*
export const CommandSynonyms: Record<string, string[]> = {
    [COMMAND_TYPE.ATTACK_AGENT]: [
        "attack",
        "fight",
        "hit",
        "strike",
        "assault",
        "battle"
    ],
    [COMMAND_TYPE.DO_NOTHING]: ["wait", "stand still", "idle"],
    [COMMAND_TYPE.DROP_ITEM]: [
        "drop",
        "discard",
        "put down",
        "leave",
        "abandon"
    ],
    [COMMAND_TYPE.EMOTE]: ["emote", "express", "show", "display"],
    [COMMAND_TYPE.GET_INVENTORY]: ["inventory"],
    [COMMAND_TYPE.GET_ITEM_FROM_ITEM]: ["get", "take", "remove"],
    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: ["give", "hand", "pass", "offer"],
    [COMMAND_TYPE.GO_EXIT]: ["go", "move", "walk", "run", "enter", "exit"],
    [COMMAND_TYPE.LOOK_AROUND]: ["look around", "observe", "survey", "scan"],
    [COMMAND_TYPE.LOOK_AT_AGENT]: ["look", "examine", "inspect", "observe"],
    [COMMAND_TYPE.LOOK_AT_EXIT]: ["look", "examine"],
    [COMMAND_TYPE.LOOK_AT_ITEM]: ["look", "examine"],
    [COMMAND_TYPE.PICK_UP_ITEM]: ["pick up", "take", "grab", "get"],
    [COMMAND_TYPE.SPEAK_TO_AGENT]: ["speak to", "say", "ask", "tell"],
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: [],
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: [],
    [COMMAND_TYPE.WAIT]: ["wait", "pause", "hold", "delay"],
    [COMMAND_TYPE.SEARCH_ITEM]: ["search", "loot"],
    [COMMAND_TYPE.SEARCH_LOCATION]: ["search", "loot"],
    [COMMAND_TYPE.SEARCH_EXIT]: ["search", "loot"],
    [COMMAND_TYPE.REVEAL_ITEM]: [],
    [COMMAND_TYPE.REVEAL_EXIT]: [],
    [COMMAND_TYPE.UNLOCK_EXIT]: ["unlock", "open"],
    //[COMMAND_TYPE.USE_ITEM]: ["use", "apply"],
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: []
};
*/
export const createTools = (
    locationIdList: string[],
    agentIdList: string[],
    itemIdList: string[],
    exitIdList: string[],
    creatureTemplateIdList: string[]
): Record<COMMAND_TYPE, AiTool> => ({
    [COMMAND_TYPE.ATTACK_AGENT]: {
        name: COMMAND_TYPE.ATTACK_AGENT,
        description: "Attack an agent in the same location, in an attempt to defeat them or cause them harm. If the text suggests that the primary action is to attack an agent, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            target_agent_id: {
                type: "string",
                description: `The id of the agent to attack. The permitted agent values are: ${agentIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.DO_NOTHING]: {
        name: COMMAND_TYPE.DO_NOTHING,
        description: "Do nothing",
        parameters: {}
    },
    [COMMAND_TYPE.DROP_ITEM]: {
        name: COMMAND_TYPE.DROP_ITEM,
        description: "Drop an item",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to drop. The permitted item values are: ${itemIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.EMOTE]: {
        name: COMMAND_TYPE.EMOTE,
        description: "Perform an action that has no direct effect, or express a visible action or emotion. This can be used as a catch-all if nothing else seems to fit. Do not include any speech. Do not do anything that is covered by other commands. Describe the action from a third-person perspective. Do not prefix with the agent's name, simply output the emote text.",
        parameters: {
            emote_text: {
                type: "string",
                description: "A description of the character's expression, or emotional state that others can observe."
            },
            agent_id: {
                type: "string",
                description: `The id of the agent performing the emote. The permitted agent values are: ${agentIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.EVENT]: {
        name: COMMAND_TYPE.EVENT,
        description: "Trigger an event in the game. This might happen if the user describes a game event that should happen, such as a sound, a fire appearing, the ground shaking, or a rainstorm.",
        parameters: {
            event_text: {
                type: "string",
                description: "A description of the event to trigger. This should be a short, simple description of the event."
            }
        }
    },
    [COMMAND_TYPE.GET_INVENTORY]: {
        name: COMMAND_TYPE.GET_INVENTORY,
        description: "Get a list of items in your inventory",
        parameters: {}
    },
    [COMMAND_TYPE.GET_ITEM_FROM_ITEM]: {
        name: COMMAND_TYPE.GET_ITEM_FROM_ITEM,
        description: "Get an item from an container item. This might happen if the user asks you to get something from a container or bag. The container must be visible, not hidden. The container must be owned by the agent, or be in the agent's current location.",
        parameters: {
            container_item_id: {
                type: "string",
                description: `The id of the item to get the item from. The permitted item values are: ${itemIdList.join(', ')}.`
            },
            target_item_id: {
                type: "string",
                description: `The id of the item to get. The permitted item values are: ${itemIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: {
        name: COMMAND_TYPE.GIVE_ITEM_TO_AGENT,
        description: "Give an item from your inventory to another agent in the same location. If your agent wants an item from another agent, do not call this tool. Instead, call the 'speak_to_agent' tool to ask the other agent if they have the item and want to give it.",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to give. The permitted item values are: ${itemIdList.join(', ')}.`
            },
            target_agent_id: {
                type: "string",
                description: `The id of the agent to give the item to. The permitted agent values are: ${agentIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.GO_EXIT]: {
        name: COMMAND_TYPE.GO_EXIT,
        description: "Move the agent through the specified exit. This will change the agent's location. If another agent in the same location has blocked the exit, do not execute this call. Instead call an emote to describe the agent's inability to leave.",
        parameters: {
            exit_id: {
                type: "string",
                description: `The id of the exit to move through. The permitted exit values are: ${exitIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.LOOK_AROUND]: {
        name: COMMAND_TYPE.LOOK_AROUND,
        description: "Take a very detailed look around the current location.",
        parameters: {}
    },
    [COMMAND_TYPE.LOOK_AT_AGENT]: {
        name: COMMAND_TYPE.LOOK_AT_AGENT,
        description: "Look at a game character present in the same location, eg 'look at Bob'. If (and only if) the text suggests that the primary action is to look at a character, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            agent_id: {
                type: "string",
                description: `The id of the agent (character) to look at. The permitted agent values are: ${agentIdList.join(', ')}.`,
                enum: agentIdList
            }
        }
    },
    [COMMAND_TYPE.LOOK_AT_EXIT]: {
        name: COMMAND_TYPE.LOOK_AT_EXIT,
        description: "Look at an exit",
        parameters: {
            exit_id: {
                type: "string",
                description: `The id of the exit to look at. The permitted exit values are: ${exitIdList.join(', ')}.`,
                enum: exitIdList
            }
        }
    },
    [COMMAND_TYPE.LOOK_AT_ITEM]: {
        name: COMMAND_TYPE.LOOK_AT_ITEM,
        description: "Look at an item. If (and only if) the text suggests that the primary action is to look at an item, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to look at. The permitted item values are: ${itemIdList.join(', ')}.`,
                enum: itemIdList
            }
        }
    },
    [COMMAND_TYPE.PICK_UP_ITEM]: {
        name: COMMAND_TYPE.PICK_UP_ITEM,
        description: "Get or pick up an item in your current location, not contained in another item. The item must be visible, not hidden. If the item is hidden, do not call this tool.",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to pick up. The permitted item values are: ${itemIdList.join(', ')}.`,
                enum: itemIdList
            }
        }
    },
    [COMMAND_TYPE.REVEAL_EXIT]: {
        name: COMMAND_TYPE.REVEAL_EXIT,
        description: "Change a hidden exit to a visible exit. This might happen if the user searches the location where the hidden exit is.",
        parameters: {
            exit_id: {
                type: "string",
                description: `The id of the exit to reveal. The permitted exit values are: ${exitIdList.join(', ')}.`
            },
            reason: {
                type: "string",
                description: "The reason for revealing the exit. This should be a short explanation for why the exit is being revealed."
            }
        }
    },
    [COMMAND_TYPE.REVEAL_ITEM]: {
        name: COMMAND_TYPE.REVEAL_ITEM,
        description: "Change a hidden item to a visible item. This might happen if the user searches the location or containing item where the hidden item is. Do not use this to create new items. Only reveal an item if it has an ownerKind of 'location' (i.e is not contained within another item or owned by an agent).",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to reveal. The permitted item values are: ${itemIdList.join(', ')}.`
            },
            reason: {
                type: "string",
                description: "The reason for revealing the item. This should be a short explanation for why the item is being revealed."
            }
        }
    },
    [COMMAND_TYPE.SEARCH_EXIT]: {
        name: COMMAND_TYPE.SEARCH_EXIT,
        description: "Search an exit for hidden items or information. If (and only if) the text suggests that the primary action is to search an exit, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            exit_id: {
                type: "string",
                description: `The id of the exit to search. The permitted exit values are: ${exitIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.SEARCH_ITEM]: {
        name: COMMAND_TYPE.SEARCH_ITEM,
        description: "Open, search inside, or look inside an item for hidden items or information. If (and only if) the text suggests that the primary action is to open, search, or look inside an item, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to search. The permitted item values are: ${itemIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.SEARCH_LOCATION]: {
        name: COMMAND_TYPE.SEARCH_LOCATION,
        description: "Search the current location for items or exits.",
        parameters: {
            location_id: {
                type: "string",
                description: `The id of the location to search. The permitted location values are: ${locationIdList.join(', ')}.`
            }
        }
    },
    [COMMAND_TYPE.SPAWN_AGENT]: {
        name: COMMAND_TYPE.SPAWN_AGENT,
        description: "Cause an agent or creature to appear. You can choose one from the location creatureTemplates in the context. This might happen if the location notes say that a particular creature might spawn here.",
        parameters: {
            template_id: {
                type: "string",
                description: `The id of the creature template to spawn. The permitted template values are: ${creatureTemplateIdList.join(', ')}.`
            },
            location_id: {
                type: "string",
                description: `The id of the location to spawn the agent. The permitted location values are: ${locationIdList.join(', ')}.`
            },
            name: {
                type: "string",
                description: "The name of the agent to spawn. Give them a unique and memorable name."
            }
        }
    },
    [COMMAND_TYPE.SPEAK_TO_AGENT]: {
        name: COMMAND_TYPE.SPEAK_TO_AGENT,
        description: "Speak to an agent who is in the same location. You should call this if an agent has just spoken to you. If the input text starts with 'talk to' or 'say' or 'ask' or 'tell', then they are indicating that this tool should be called. Only return the spoken text, without any additional descriptive text. Exclude quotation marks. Eg: Hello Bob, how are you?",
        parameters: {
            target_agent_id: {
                type: "string",
                description: `The id of the other agent to speak to. The permitted agent values are: ${agentIdList.join(', ')}.`
            },
            message: {
                type: "string",
                description: "The message to speak to the other agent, without any additional descriptive text. Exclude quotation marks."
            }
        }
    },
    [COMMAND_TYPE.UNLOCK_EXIT]: {
        name: COMMAND_TYPE.UNLOCK_EXIT,
        description: "Unlock an exit. Do not do this lightly. This only happens under special circumstances, such as the correct key being used to unlock the exit. An agent must initiate this action by doing something specific to unlock the exit. For example, it is not enough to simply pick up a key. The user must state that the key was used to unlock the exit.",
        parameters: {
            exit_id: {
                type: "string",
                description: `The id of the exit to unlock. The permitted exit values are: ${exitIdList.join(', ')}. Hidden exits cannot be unlocked.`
            },
            reason: {
                type: "string",
                description: "The reason for unlocking the exit. This should be a short explanation for why the exit is being unlocked."
            }
        }
    },
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: {
        name: COMMAND_TYPE.UPDATE_AGENT_INTENT,
        description: "Update your short-term goals so you can remember what you are doing. Briefly describing what you are doing or planning to do next. This overrides any previous intent. This does not change your location. The game state does not change when you update your intent. Your intent should begin with 'I intend to...'",
        parameters: {
            intent: {
                type: "string",
                description: "Your new short-term goals. Briefly describing what you are doing or planning to do next."
            }
        }
    },
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: {
        name: COMMAND_TYPE.UPDATE_AGENT_MOOD,
        description: "Update your mood. This overrides any previous mood. This does not change your location. The game state does not change when you update your mood. If something has happened that is likely to have affected your emotional state, this tool should be called. Pass text that would fit after the words 'I am feeling...' but do not actually include the words 'I am feeling...'",
        parameters: {
            mood: {
                type: "string",
                description: "Your new mood. This should be a single word or phrase describing your emotional state."
            }
        }
    },
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: {
        name: COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION,
        description: "Update the description of an item. This might happen something happens to the object that should be reflected in the description.",
        parameters: {
            item_id: {
                type: "string",
                description: `The id of the item to update. The permitted item values are: ${itemIdList.join(', ')}.`
            },
            description: {
                type: "string",
                description: "The new description for the item."
            },
            reason: {
                type: "string",
                description: "The reason for updating the item description. This should be a short explanation for why the item description is being updated."
            }
        }
    },
    // [COMMAND_TYPE.USE_ITEM]: {
    //     name: COMMAND_TYPE.USE_ITEM,
    //     description: "Use an item on something",
    //     parameters: {
    //         object_type: {
    //             type: "string",
    //             description: "The type of object to use the item on. This must be one of the following: 'agent', 'location', 'item', or 'exit'."
    //         },
    //         object_id: {
    //             type: "string",
    //             description: `The id of the object to use the item on. The permitted values depend on the object_type:
    //             - For 'agent': ${agentIdList.join(', ')}
    //             - For 'location': ${locationIdList.join(', ')}
    //             - For 'item': ${itemIdList.join(', ')}
    //             - For 'exit': ${exitIdList.join(', ')}`
    //         },
    //         item_id: {
    //             type: "string",
    //             description: `The id of the item to use. The permitted item values are: ${itemIdList.join(', ')}.`
    //         }
    //     }
    // },
    [COMMAND_TYPE.WAIT]: {
        name: COMMAND_TYPE.WAIT,
        description: "Do nothing for this turn",
        parameters: {}
    }
});
