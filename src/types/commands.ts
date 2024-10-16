import { FunctionDefinition } from "openai/resources";
import { COMMAND_TYPE, OpenAiCommand } from "./types";

export const EMOTE_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.EMOTE,
        description: "Perform an action that has no direct effect, or express a visible action or emotion. Do not include any speech. Do not do anything that is covered by other commands. Describe the action from a third-person perspective. Do not prefix with the agent's name, simply output the emote text.",
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
            required: ["emote_text"],
            additionalProperties: false
        }
    }
};

export const GO_EXIT_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const PICK_UP_ITEM_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.PICK_UP_ITEM,
        description: "Get, grab, collect or pick up an item near you.",
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
        }
    }
};

export const DROP_ITEM_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const SPEAK_TO_AGENT_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const WAIT_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.WAIT,
        description: "Do nothing for this turn",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
};

export const GIVE_ITEM_TO_AGENT_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const ATTACK_AGENT_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const SEARCH_LOCATION_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.SEARCH_LOCATION,
        description: "Search the current location for items or exits.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
};

export const UPDATE_AGENT_INTENT_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const UPDATE_AGENT_MOOD_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const LOOK_AT_ITEM_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const LOOK_AT_AGENT_COMMAND: OpenAiCommand = {
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
            additionalProperties: false
        }
    }
};

export const LOOK_AROUND_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.LOOK_AROUND,
        description: "Take a very detailed look around the current location.",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
};

export const LOOK_AT_EXIT_COMMAND: OpenAiCommand = {
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
        }
    }
};

export const GET_INVENTORY_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.GET_INVENTORY,
        description: "Get a list of items in your inventory",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
};

export const REVEAL_ITEM_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.REVEAL_ITEM,
        description: "Change a hidden item to a visible item. This might happen if the user searches the location where the hidden item is. Do not use this to create new items.",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to reveal. This must match item_id values listed in the items_present array of the context."
                }
            },
            required: ["item_id"],
            additionalProperties: false
        }
    }
};

export const REVEAL_EXIT_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.REVEAL_EXIT,
        description: "Change a hidden exit to a visible exit. This might happen if the user searches the location where the hidden exit is.",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string"
                }
            },
            required: ["exit_id"],
            additionalProperties: false
        }
    }
};

export const UPDATE_ITEM_DESCRIPTION_COMMAND: OpenAiCommand = {
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
                }
            },
            required: ["item_id", "description"],
            additionalProperties: false
        }
    }
};

export const DO_NOTHING_COMMAND: OpenAiCommand = {
    type: "function",
    function: {
        name: COMMAND_TYPE.DO_NOTHING,
        description: "Do nothing",
        parameters: {
            type: "object",
            properties: {},
            additionalProperties: false
        }
    }
};




