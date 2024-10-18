import { FunctionDefinition } from "openai/resources";
import { OpenAiCommand } from "./types";

export enum COMMAND_TYPE {
    ATTACK_AGENT = "attack_agent",
    DO_NOTHING = "do_nothing",
    DROP_ITEM = "drop_item",
    EMOTE = "emote",
    GET_INVENTORY = "get_inventory",
    GET_ITEM_FROM_ITEM = "get_item_from_item",
    GIVE_ITEM_TO_AGENT = "give_item_to_agent",
    GO_EXIT = "go_exit",
    LOOK_AROUND = "look_around",
    LOOK_AT_AGENT = "look_at_agent",
    LOOK_AT_EXIT = "look_at_exit",
    LOOK_AT_ITEM = "look_at_item",
    PICK_UP_ITEM = "pick_up_item",
    SPEAK_TO_AGENT = "speak_to_agent",
    UPDATE_AGENT_INTENT = "update_agent_intent",
    UPDATE_AGENT_MOOD = "update_agent_mood",
    WAIT = "wait",
    SEARCH_ITEM = "search_item",
    SEARCH_LOCATION = "search_location",
    SEARCH_EXIT = "search_exit",
    REVEAL_ITEM = "reveal_item",
    REVEAL_EXIT = "reveal_exit",
    UNLOCK_EXIT = "unlock_exit",
    USE_ITEM = "use_item",
    UPDATE_ITEM_DESCRIPTION = "update_item_description"
}

export type ToolCallArguments = {
    [COMMAND_TYPE.ATTACK_AGENT]: { target_agent_id: string };
    [COMMAND_TYPE.DROP_ITEM]: { item_id: string };
    [COMMAND_TYPE.DO_NOTHING]: object;
    [COMMAND_TYPE.EMOTE]: { emote_text: string; agent_id: string };
    [COMMAND_TYPE.GET_INVENTORY]: object;
    [COMMAND_TYPE.GET_ITEM_FROM_ITEM]: {
        item_id: string;
        target_item_id: string;
    };
    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: {
        item_id: string;
        target_agent_id: string;
    };
    [COMMAND_TYPE.GO_EXIT]: { exit_id: string };
    [COMMAND_TYPE.LOOK_AROUND]: object;
    [COMMAND_TYPE.LOOK_AT_AGENT]: { agent_id: string };
    [COMMAND_TYPE.LOOK_AT_EXIT]: { exit_id: string };
    [COMMAND_TYPE.LOOK_AT_ITEM]: { item_id: string };
    [COMMAND_TYPE.PICK_UP_ITEM]: { item_id: string };
    [COMMAND_TYPE.REVEAL_EXIT]: { exit_id: string, reason: string };
    [COMMAND_TYPE.REVEAL_ITEM]: { item_id: string, reason: string };
    [COMMAND_TYPE.SEARCH_EXIT]: { exit_id: string };
    [COMMAND_TYPE.SEARCH_ITEM]: { item_id: string };
    [COMMAND_TYPE.SEARCH_LOCATION]: { location_id: string };
    [COMMAND_TYPE.SPEAK_TO_AGENT]: { target_agent_id: string; message: string };
    [COMMAND_TYPE.UNLOCK_EXIT]: { exit_id: string, reason: string };
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: { intent: string, reason: string };
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: { mood: string, reason: string };
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: {
        item_id: string;
        description: string;
        reason: string;
    };
    [COMMAND_TYPE.USE_ITEM]: {
        object_type: string;
        object_id: string;
        item_id: string;
    };
    [COMMAND_TYPE.WAIT]: object;
};

export const CommandSynonyms: Record<string, string[]> = {
    [COMMAND_TYPE.ATTACK_AGENT]: ["attack", "fight", "hit", "strike", "assault", "battle"],
    [COMMAND_TYPE.DO_NOTHING]: ["wait", "stand still", "idle"],
    [COMMAND_TYPE.DROP_ITEM]: ["drop", "discard", "put down", "leave", "abandon"],
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
    [COMMAND_TYPE.USE_ITEM]: ["use", "apply"],
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: []
}


const ATTACK_AGENT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.ATTACK_AGENT,
        description: "Attack an agent in the same location, in an attempt to defeat them or cause them harm. If the text suggests that the primary action is to attack an agent, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                target_agent_id: {
                    type: "string",
                    description: "The id of the agent to attack. This must match agent_id values listed in the agents_present array of the context."
                }
            },
            required: ["target_agent_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const DO_NOTHING_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.DO_NOTHING,
        description: "Do nothing",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        },
        strict: true
    }
};

const DROP_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.DROP_ITEM,
        description: "Drop an item",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to drop. This must match item_id values listed in the inventory array of the context."
                }
            },
            required: ["item_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const EMOTE_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.EMOTE,
        description: "Perform an action that has no direct effect, or express a visible action or emotion. This can be used as a catch-all if nothing else seems to fit. Do not include any speech. Do not do anything that is covered by other commands. Describe the action from a third-person perspective. Do not prefix with the agent's name, simply output the emote text.",
        parameters: {
            type: "object",
            properties: {
                emote_text: {
                    type: "string",
                    description: "A description of the character's expression, or emotional state that others can observe."
                },
                agent_id: {
                    type: "string",
                    description: "The id of the agent performing the emote. This must match agent_id values listed in the agents_present array of the context."
                }
            },
            required: ["emote_text", "agent_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const GET_INVENTORY_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.GET_INVENTORY,
        description: "Get a list of items in your inventory",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        },
        strict: true
    }
};

 const GET_ITEM_FROM_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.GET_ITEM_FROM_ITEM,
        description: "Get a visible item from another visible item that is in your current location or inventory. This might happen if the user asks you to get something from a container or bag. The items must be visible, not hidden. If either item is hidden, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to get. This must match item_id values listed in the items_present array of the context."
                },
                target_item_id: {
                    type: "string",
                    description: "The id of the item to get the item from. This must match item_id values listed in the items_present array of the context."
                }
            },
            required: ["item_id", "target_item_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const GIVE_ITEM_TO_AGENT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.GIVE_ITEM_TO_AGENT,
        description: "Give an item from your inventory to another agent in the same location. If your agent wants an item from another agent, do not call this tool. Instead, call the 'speak_to_agent' tool to ask the other agent if they have the item and want to give it.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to give. This must match item_id values listed in the inventory array of the context."
                },
                target_agent_id: {
                    type: "string",
                    description: "The id of the agent to give the item to. This must match agent_id values listed in the agents_present array of the context."
                }
            },
            required: ["item_id", "target_agent_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const GO_EXIT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.GO_EXIT,
        description: "Move the agent through the specified exit. This will change the agent's location.",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string",
                    description: "The id of the exit to move through. This must match exit_id values listed in the exits array of the context."
                }
            },
            required: ["exit_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const LOOK_AROUND_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.LOOK_AROUND,
        description: "Take a very detailed look around the current location.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        },
        strict: true
    }
};

const LOOK_AT_AGENT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.LOOK_AT_AGENT,
        description: "Look at a game character present in the same location, eg 'look at Bob'. If (and only if) the text suggests that the primary action is to look at a character, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                agent_id: {
                    type: "string",
                    description: "The id of the agent (character) to look at. This must match agent_id values listed in the agents_present array of the context."
                }
            },
            required: ["agent_id"],
            additionalProperties: false,
            
        },
        strict: true
    }
};

const LOOK_AT_EXIT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.LOOK_AT_EXIT,
        description: "Look at an exit",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string",
                    description: "The id of the exit to look at. This must match exit_id values listed in the exits array of the context."
                }
            },
            required: ["exit_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const LOOK_AT_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.LOOK_AT_ITEM,
        description: "Look at an item. If (and only if) the text suggests that the primary action is to look at an item, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to look at. This must match item_id values listed in the items_present array or inventory array of the context."
                }
            },
            required: ["item_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const PICK_UP_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.PICK_UP_ITEM,
        description: "Get, grab, collect or pick up an item in your current location, not contained in another item. The item must be visible, not hidden. If the item is hidden, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to get, grab, collect or pick up. This must match item_id values listed in the items_present array of the context."
                }
            },
            required: ["item_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const REVEAL_EXIT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.REVEAL_EXIT,
        description: "Change a hidden exit to a visible exit. This might happen if the user searches the location where the hidden exit is.",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string"
                },
                reason: {
                    type: "string",
                    description: "The reason for revealing the exit. This should be a short explanation for why the exit is being revealed."
                }
            },
            required: ["exit_id", "reason"],
            additionalProperties: false
        },
        strict: true
    }
};

const REVEAL_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.REVEAL_ITEM,
        description: "Change a hidden item to a visible item. This might happen if the user searches the location or containing item where the hidden item is. Do not use this to create new items. Never, under any circumstances, reveal an item if it is contained within a hidden item.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to reveal. This must match item_id values listed in the items_present array or inventory array of the context."
                },
                reason: {
                    type: "string",
                    description: "The reason for revealing the item. This should be a short explanation for why the item is being revealed."
                }
            },
            required: ["item_id", "reason"],
            additionalProperties: false
        },
        strict: true
    }
};

const SEARCH_EXIT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.SEARCH_EXIT,
        description: "Search an exit for hidden items or information. If (and only if) the text suggests that the primary action is to search an exit, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string",
                    description: "The id of the exit to search. This must match exit_id values listed in the exits array of the context."
                }
            },
            required: ["exit_id"],
            additionalProperties: false
        },
        strict: true      
    }
};

const SEARCH_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.SEARCH_ITEM,
        description: "Open, search inside, or look inside an item for hidden items or information. If (and only if) the text suggests that the primary action is to open, search, or look inside an item, then call this tool. Otherwise, do not call this tool.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to search. This must match item_id values listed in the items_present array or inventory array of the context."
                }
            },
            required: ["item_id"],
            additionalProperties: false
        },
        strict: true
    }
};

const SEARCH_LOCATION_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.SEARCH_LOCATION,
        description: "Search the current location for items or exits.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        },
        strict: true
    }
};

const SPEAK_TO_AGENT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.SPEAK_TO_AGENT,
        description: "Speak to an agent who is in the same location. You should call this if an agent has just spoken to you. If the input text starts with 'talk to' or 'say' or 'ask' or 'tell', then they are indicating that this tool should be called. Only return the spoken text, without any additional descriptive text. Exclude quotation marks. Eg: Hello Bob, how are you?",
        parameters: {
            type: "object",
            properties: {
                target_agent_id: {
                    type: "string",
                    description: "The id of the other agent to speak to. This must match agent_id values listed in the agents_present array of the context."
                },
                message: {
                    type: "string",
                    description: "The message to speak to the other agent, without any additional descriptive text. Exclude quotation marks."
                }
            },
            required: ["target_agent_id", "message"],
            additionalProperties: false
        },
        strict: true
    }
};

const UNLOCK_EXIT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.UNLOCK_EXIT,
        description: "Unlock an exit. Do not do this lightly. This only happens under special circumstances, such as the correct key being used to unlock the exit. An agent must initiate this action by doing something specific to unlock the exit. For example, it is not enough to simply pick up a key. The user must state that the key was used to unlock the exit.",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string",
                    description: "The id of the exit to unlock. This must match exit_id values listed in the exits array of the context. Hidden exits cannot be unlocked."
                },
                reason: {
                    type: "string",
                    description: "The reason for unlocking the exit. This should be a short explanation for why the exit is being unlocked."
                }
            },
            required: ["exit_id", "reason"],
            additionalProperties: false,
        },
        strict: true
    }
};

const UPDATE_AGENT_INTENT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.UPDATE_AGENT_INTENT,
        description: "Update your short-term goals so you can remember what you are doing. Briefly describing what you are doing or planning to do next. This overrides any previous intent. This does not change your location. The game state does not change when you update your intent. Your intent should begin with 'I intend to...'",
        parameters: {
            type: "object",
            properties: {
                intent: {
                    type: "string",
                    description: "Your new short-term goals. Briefly describing what you are doing or planning to do next."
                }
            },
            required: ["intent"],
            additionalProperties: false
        },
        strict: true
    }
};

const UPDATE_AGENT_MOOD_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.UPDATE_AGENT_MOOD,
        description: "Update your mood. This overrides any previous mood. This does not change your location. The game state does not change when you update your mood. If something has happened that is likely to have affected your emotional state, this tool should be called. Pass text that would fit after the words 'I am feeling...' but do not actually include the words 'I am feeling...'",
        parameters: {
            type: "object",
            properties: {
                mood: {
                    type: "string",
                    description: "Your new mood. This should be a single word or phrase describing your emotional state."
                }
            },
            required: ["mood"],
            additionalProperties: false
        },
        strict: true
    }
};

const UPDATE_ITEM_DESCRIPTION_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION,
        description: "Update the description of an item. This might happen something happens to the object that should be reflected in the description.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string"
                },
                description: {
                    type: "string"
                },
                reason: {
                    type: "string",
                    description: "The reason for updating the item description. This should be a short explanation for why the item description is being updated."
                }
            },
            required: ["item_id", "description", "reason"],
            additionalProperties: false,        
        },
        strict: true
    }
};

const USE_ITEM_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.USE_ITEM,
        description: "Use an item on something",
        parameters: {
            type: "object",
            properties: {
                object_type: {
                    type: "string",
                    description: "The type of object to use the item on. This must be one of the following: 'agent', 'location', 'item', or 'exit'."
                },
                object_id: {
                    type: "string",
                    description: "The id of the object to use the item on. This must match object_id values listed in the objects array of the context."
                },
                item_id: {
                    type: "string",
                    description: "The id of the item to use. This must match item_id values listed in the inventory array of the context."
                }
            },
            required: ["object_type", "object_id", "item_id"],
            additionalProperties: false,
        },
        strict: true
    }
};

const WAIT_TOOL: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.WAIT,
        description: "Do nothing for this turn",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        },
        strict: true
    },
};

export const Tools: Record<COMMAND_TYPE, OpenAiCommand> = {
    [COMMAND_TYPE.ATTACK_AGENT]: ATTACK_AGENT_TOOL,
    [COMMAND_TYPE.DO_NOTHING]: DO_NOTHING_TOOL,
    [COMMAND_TYPE.DROP_ITEM]: DROP_ITEM_TOOL,
    [COMMAND_TYPE.EMOTE]: EMOTE_TOOL,
    [COMMAND_TYPE.GET_INVENTORY]: GET_INVENTORY_TOOL,
    [COMMAND_TYPE.GET_ITEM_FROM_ITEM]: GET_ITEM_FROM_ITEM_TOOL,
    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: GIVE_ITEM_TO_AGENT_TOOL,
    [COMMAND_TYPE.GO_EXIT]: GO_EXIT_TOOL,
    [COMMAND_TYPE.LOOK_AROUND]: LOOK_AROUND_TOOL,
    [COMMAND_TYPE.LOOK_AT_AGENT]: LOOK_AT_AGENT_TOOL,
    [COMMAND_TYPE.LOOK_AT_EXIT]: LOOK_AT_EXIT_TOOL,
    [COMMAND_TYPE.LOOK_AT_ITEM]: LOOK_AT_ITEM_TOOL,
    [COMMAND_TYPE.PICK_UP_ITEM]: PICK_UP_ITEM_TOOL,
    [COMMAND_TYPE.REVEAL_EXIT]: REVEAL_EXIT_TOOL,
    [COMMAND_TYPE.REVEAL_ITEM]: REVEAL_ITEM_TOOL,
    [COMMAND_TYPE.SEARCH_EXIT]: SEARCH_EXIT_TOOL,
    [COMMAND_TYPE.SEARCH_ITEM]: SEARCH_ITEM_TOOL,
    [COMMAND_TYPE.SEARCH_LOCATION]: SEARCH_LOCATION_TOOL,
    [COMMAND_TYPE.SPEAK_TO_AGENT]: SPEAK_TO_AGENT_TOOL,
    [COMMAND_TYPE.UNLOCK_EXIT]: UNLOCK_EXIT_TOOL,
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: UPDATE_AGENT_INTENT_TOOL,
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: UPDATE_AGENT_MOOD_TOOL,
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: UPDATE_ITEM_DESCRIPTION_TOOL,
    [COMMAND_TYPE.USE_ITEM]: USE_ITEM_TOOL,
    [COMMAND_TYPE.WAIT]: WAIT_TOOL
};

