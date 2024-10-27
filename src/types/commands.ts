import { AiTool } from "./types";

// Keep the enum as-is since it's used in other parts of the codebase
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
    DISPLAY_HELP_TEXT = "display_help_text",
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
    WAIT = "wait",
}

// Define the structure for command information
export type CommandInfo<TArgs = any> = {
    type: COMMAND_TYPE;
    description: string;
    synonyms: string[];
    arguments: TArgs;
    tool: (params: {
        locationIdList: string[];
        agentIdList: string[];
        itemIdList: string[];
        exitIdList: string[];
        creatureTemplateIdList: string[];
    }) => AiTool;
};

type COMMAND_LOOKUP = {
    [key in COMMAND_TYPE]: CommandInfo;
};

// Unified command definitions
export const COMMANDS: COMMAND_LOOKUP = {
    [COMMAND_TYPE.ATTACK_AGENT]: {
        type: COMMAND_TYPE.ATTACK_AGENT,
        description: "Attack something",
        synonyms: ["attack", "fight", "hit", "strike", "assault", "battle"],
        arguments: {} as { target_agent_id: string },
        tool: ({ agentIdList }: { agentIdList: string[] }) => ({
            name: COMMAND_TYPE.ATTACK_AGENT,
            description: "Attack an agent in the same location, in an attempt to defeat them or cause them harm. If the text suggests that the primary action is to attack an agent, then call this tool. Otherwise, do not call this tool.",
            parameters: {
                target_agent_id: {
                    type: "string",
                    description: `The id of the agent to attack. The permitted agent values are: ${agentIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.DO_NOTHING]: {
        type: COMMAND_TYPE.DO_NOTHING,
        description: "Do nothing",
        synonyms: ["wait", "stand still", "idle"],
        arguments: {} as object,
        tool: () => ({
            name: COMMAND_TYPE.DO_NOTHING,
            description: "Do nothing",
            parameters: {}
        })
    },

    [COMMAND_TYPE.DROP_ITEM]: {
        type: COMMAND_TYPE.DROP_ITEM,
        description: "Drop an item",
        synonyms: ["drop", "discard", "put down", "leave", "abandon"],
        arguments: {} as { item_id: string },
        tool: ({ itemIdList }: { itemIdList: string[] }) => ({
            name: COMMAND_TYPE.DROP_ITEM,
            description: "Drop an item",
            parameters: {
                item_id: {
                    type: "string",
                    description: `The id of the item to drop. The permitted item values are: ${itemIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.GET_ITEM_FROM_ITEM]: {
        type: COMMAND_TYPE.GET_ITEM_FROM_ITEM,
        description: "Get an item from an container item",
        synonyms: ["get", "take", "remove"],
        arguments: {} as { container_item_id: string; target_item_id: string },
        tool: ({ itemIdList }: { itemIdList: string[] }) => ({
            name: COMMAND_TYPE.GET_ITEM_FROM_ITEM,
            description: "Get an item from an container item. This might happen if the user asks you to get something from a container or bag. Do not call this tool to pick something up that is not in a container. The container must be visible, not hidden. The container must be owned by the agent, or be in the agent's current location.",
            parameters: {
                container_item_id: {
                    type: "string",
                    description: `The id of the container, within which is the item sought. The permitted item values are: ${itemIdList.join(', ')}.`
                },
                target_item_id: {
                    type: "string",
                    description: `The id of the item to get from the container. The permitted item values are: ${itemIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.SPAWN_AGENT]: {
        type: COMMAND_TYPE.SPAWN_AGENT,
        description: "Cause an agent or creature to appear",
        synonyms: [],
        arguments: {} as { template_id: string; location_id: string; name: string },
        tool: ({ locationIdList, creatureTemplateIdList }: { locationIdList: string[]; creatureTemplateIdList: string[] }) => ({
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
        })
    },

    [COMMAND_TYPE.SPEAK_TO_AGENT]: {
        type: COMMAND_TYPE.SPEAK_TO_AGENT,
        description: "Speak to an agent",
        synonyms: ["speak to", "say", "ask", "tell"],
        arguments: {} as { target_agent_id: string; message: string },
        tool: ({ agentIdList }: { agentIdList: string[] }) => ({
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
        })
    },

    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: {
        type: COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION,
        description: "Update an item's description",
        synonyms: [],
        arguments: {} as { item_id: string; description: string; reason: string },
        tool: ({ itemIdList }: { itemIdList: string[] }) => ({
            name: COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION,
            description: "Signify that an item has physically changed, perhaps from being crumpled, cracked, or otherwise altered. This change must be reflected in the description of the item. Do not use this tool to change to owner of an item.",
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
        })
    },

    [COMMAND_TYPE.SEARCH_LOCATION]: {
        type: COMMAND_TYPE.SEARCH_LOCATION,
        description: "Search the current location for items or exits",
        synonyms: ["search", "loot"],
        arguments: {} as { location_id: string },
        tool: ({ locationIdList }: { locationIdList: string[] }) => ({
            name: COMMAND_TYPE.SEARCH_LOCATION,
            description: "Search the current location for items or exits.",
            parameters: {
                location_id: {
                    type: "string",
                    description: `The id of the location to search. The permitted location values are: ${locationIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.REVEAL_EXIT]: {
        type: COMMAND_TYPE.REVEAL_EXIT,
        description: "Change a hidden exit to a visible exit",
        synonyms: [],
        arguments: {} as { exit_id: string; reason: string },
        tool: ({ exitIdList }: { exitIdList: string[] }) => ({
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
        })
    },

    [COMMAND_TYPE.LOOK_AROUND]: {
        type: COMMAND_TYPE.LOOK_AROUND,
        description: "Look around the current location to get a description of what you can see",
        synonyms: ["look", "observe", "survey", "examine room", "examine area"],
        arguments: {} as { location_id: string },
        tool: ({ locationIdList }: { locationIdList: string[] }) => ({
            name: COMMAND_TYPE.LOOK_AROUND,
            description: "Look around the current location to get a description of what you can see.",
            parameters: {
                location_id: {
                    type: "string",
                    description: `The id of the location to look at. The permitted location values are: ${locationIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.LOOK_AT_AGENT]: {
        type: COMMAND_TYPE.LOOK_AT_AGENT,
        description: "Look at a specific agent to get a detailed description of them",
        synonyms: ["examine", "inspect", "observe"],
        arguments: {} as { target_agent_id: string },
        tool: ({ agentIdList }: { agentIdList: string[] }) => ({
            name: COMMAND_TYPE.LOOK_AT_AGENT,
            description: "Look at a specific agent to get a detailed description of them.",
            parameters: {
                target_agent_id: {
                    type: "string",
                    description: `The id of the agent to look at. The permitted agent values are: ${agentIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.LOOK_AT_ITEM]: {
        type: COMMAND_TYPE.LOOK_AT_ITEM,
        description: "Look at a specific item to get a detailed description of it",
        synonyms: ["examine", "inspect", "observe"],
        arguments: {} as { item_id: string },
        tool: ({ itemIdList }: { itemIdList: string[] }) => ({
            name: COMMAND_TYPE.LOOK_AT_ITEM,
            description: "Look at a specific item to get a detailed description of it.",
            parameters: {
                item_id: {
                    type: "string",
                    description: `The id of the item to look at. The permitted item values are: ${itemIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: {
        type: COMMAND_TYPE.UPDATE_AGENT_INTENT,
        description: "Update a game agent's current intention or goal",
        synonyms: [],
        arguments: {} as { agent_id: string; intent: string; reason: string },
        tool: ({ agentIdList }) => ({
            name: COMMAND_TYPE.UPDATE_AGENT_INTENT,
            description: "Update an agent's current intention or goal. This might happen if something significant changes in their environment or situation.",
            parameters: {
                agent_id: {
                    type: "string",
                    description: `The id of the agent whose intent to update. The permitted agent values are: ${agentIdList.join(', ')}.`
                },
                intent: {
                    type: "string",
                    description: "The new intention or goal for the agent."
                },
                reason: {
                    type: "string",
                    description: "The reason for updating the agent's intent. This should be a short explanation for why the intent is being updated."
                }
            }
        })
    },

    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: {
        type: COMMAND_TYPE.UPDATE_AGENT_MOOD,
        description: "Update a game agent's current emotional state",
        synonyms: [],
        arguments: {} as { agent_id: string; mood: string; reason: string },
        tool: ({ agentIdList }) => ({
            name: COMMAND_TYPE.UPDATE_AGENT_MOOD,
            description: "Update an agent's current emotional state. This might happen in response to events or interactions.",
            parameters: {
                agent_id: {
                    type: "string",
                    description: `The id of the agent whose mood to update. The permitted agent values are: ${agentIdList.join(', ')}.`
                },
                mood: {
                    type: "string",
                    description: "The new mood or emotional state for the agent."
                },
                reason: {
                    type: "string",
                    description: "The reason for updating the agent's mood. This should be a short explanation for why the mood is being updated."
                }
            }
        })
    },

    [COMMAND_TYPE.REVEAL_ITEM]: {
        type: COMMAND_TYPE.REVEAL_ITEM,
        description: "Make a hidden item visible",
        synonyms: [],
        arguments: {} as { item_id: string; reason: string },
        tool: ({ itemIdList }) => ({
            name: COMMAND_TYPE.REVEAL_ITEM,
            description: "Make a hidden item visible. This might happen when searching a location or container.",
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
        })
    },

    [COMMAND_TYPE.UNLOCK_EXIT]: {
        type: COMMAND_TYPE.UNLOCK_EXIT,
        description: "Unlock a locked exit using an appropriate item (like a key)",
        synonyms: ["unlock", "open"],
        arguments: {} as { exit_id: string; item_id: string },
        tool: ({ exitIdList, itemIdList }) => ({
            name: COMMAND_TYPE.UNLOCK_EXIT,
            description: "Unlock a locked exit using an appropriate item (like a key).",
            parameters: {
                exit_id: {
                    type: "string",
                    description: `The id of the exit to unlock. The permitted exit values are: ${exitIdList.join(', ')}.`
                },
                item_id: {
                    type: "string",
                    description: `The id of the item to use for unlocking. The permitted item values are: ${itemIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.EVENT]: {
        type: COMMAND_TYPE.EVENT,
        description: "Describe an event or change in the environment that isn't covered by other commands.",
        synonyms: [],
        arguments: {} as { event_text: string },
        tool: () => ({
            name: COMMAND_TYPE.EVENT,
            description: "Describe an event or change in the environment that isn't covered by other commands.",
            parameters: {
                event_text: {
                    type: "string",
                    description: "A description of what is happening in the environment."
                }
            }
        })
    },

    [COMMAND_TYPE.DISPLAY_HELP_TEXT]: {
        type: COMMAND_TYPE.DISPLAY_HELP_TEXT,
        description: "Display a list of available commands and how to use them.",
        synonyms: ["help", "commands", "?"],
        arguments: {} as object,
        tool: () => ({
            name: COMMAND_TYPE.DISPLAY_HELP_TEXT,
            description: "Display a list of available commands and how to use them.",
            parameters: {}
        })
    },

    [COMMAND_TYPE.WAIT]: {
        type: COMMAND_TYPE.WAIT,
        description: "Do nothing and let time pass.",
        synonyms: ["wait", "pause", "hold"],
        arguments: {} as object,
        tool: () => ({
            name: COMMAND_TYPE.WAIT,
            description: "Do nothing and let time pass.",
            parameters: {}
        })
    },

    [COMMAND_TYPE.EMOTE]: {
        type: COMMAND_TYPE.EMOTE,
        description: "Express an emotion or perform an action that others can observe.",
        synonyms: ["emote", "express", "show", "display"],
        arguments: {} as { emote_text: string },
        tool: () => ({
            name: COMMAND_TYPE.EMOTE,
            description: "Express an emotion or perform an action that others can observe.",
            parameters: {
                emote_text: {
                    type: "string",
                    description: "A description of the action or emotion being expressed."
                }
            }
        })
    },

    [COMMAND_TYPE.LOOK_AT_EXIT]: {
        type: COMMAND_TYPE.LOOK_AT_EXIT,
        description: "Look at a specific exit to get a detailed description of it",
        synonyms: ["examine exit", "inspect exit", "look at exit"],
        arguments: {} as { exit_id: string },
        tool: ({ exitIdList }) => ({
            name: COMMAND_TYPE.LOOK_AT_EXIT,
            description: "Look at a specific exit to get a detailed description of it.",
            parameters: {
                exit_id: {
                    type: "string",
                    description: `The id of the exit to look at. The permitted exit values are: ${exitIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.SEARCH_EXIT]: {
        type: COMMAND_TYPE.SEARCH_EXIT,
        description: "Search an exit carefully to potentially discover hidden features or information.",
        synonyms: ["search exit", "examine exit carefully", "investigate exit"],
        arguments: {} as { exit_id: string },
        tool: ({ exitIdList }) => ({
            name: COMMAND_TYPE.SEARCH_EXIT,
            description: "Search an exit carefully to potentially discover hidden features or information.",
            parameters: {
                exit_id: {
                    type: "string",
                    description: `The id of the exit to search. The permitted exit values are: ${exitIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.SEARCH_ITEM]: {
        type: COMMAND_TYPE.SEARCH_ITEM,
        description: "Search an item carefully to potentially discover hidden features or items within.",
        synonyms: ["search item", "examine item carefully", "investigate item"],
        arguments: {} as { item_id: string },
        tool: ({ itemIdList }) => ({
            name: COMMAND_TYPE.SEARCH_ITEM,
            description: "Search an item carefully to potentially discover hidden features or items within.",
            parameters: {
                item_id: {
                    type: "string",
                    description: `The id of the item to search. The permitted item values are: ${itemIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.GET_INVENTORY]: {
        type: COMMAND_TYPE.GET_INVENTORY,
        description: "Check what items you are currently carrying in your inventory.",
        synonyms: ["inventory", "i", "check inventory", "show inventory", "items"],
        arguments: {} as object,
        tool: () => ({
            name: COMMAND_TYPE.GET_INVENTORY,
            description: "Check what items you are currently carrying in your inventory.",
            parameters: {}
        })
    },

    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: {
        type: COMMAND_TYPE.GIVE_ITEM_TO_AGENT,
        description: "Give an item from your inventory to another agent.",
        synonyms: ["give", "hand", "pass", "offer"],
        arguments: {} as { item_id: string; target_agent_id: string },
        tool: ({ itemIdList, agentIdList }) => ({
            name: COMMAND_TYPE.GIVE_ITEM_TO_AGENT,
            description: "Give an item from your inventory to another agent.",
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
        })
    },

    [COMMAND_TYPE.GO_EXIT]: {
        type: COMMAND_TYPE.GO_EXIT,
        description: "Move through an exit to enter a new location.",
        synonyms: ["go", "move", "walk", "run", "enter", "leave", "exit"],
        arguments: {} as { exit_id: string },
        tool: ({ exitIdList }) => ({
            name: COMMAND_TYPE.GO_EXIT,
            description: "Move through an exit to enter a new location.",
            parameters: {
                exit_id: {
                    type: "string",
                    description: `The id of the exit to use. The permitted exit values are: ${exitIdList.join(', ')}.`
                }
            }
        })
    },

    [COMMAND_TYPE.PICK_UP_ITEM]: {
        type: COMMAND_TYPE.PICK_UP_ITEM,
        description: "Pick up an item from the current location.",
        synonyms: ["take", "grab", "get", "collect", "pick up"],
        arguments: {} as { item_id: string },
        tool: ({ itemIdList }) => ({
            name: COMMAND_TYPE.PICK_UP_ITEM,
            description: "Pick up an item from the current location.",
            parameters: {
                item_id: {
                    type: "string",
                    description: `The id of the item to pick up. The permitted item values are: ${itemIdList.join(', ')}.`
                }
            }
        })
    },

} as const;

// Generate ToolCallArguments type from COMMANDS
export type ToolCallArguments = {
    [K in keyof typeof COMMANDS]: (typeof COMMANDS)[K]['arguments']
};

// Tool creation function
export const createTools = (
    locationIdList: string[],
    agentIdList: string[],
    itemIdList: string[],
    exitIdList: string[],
    creatureTemplateIdList: string[]
): Record<COMMAND_TYPE, AiTool> => {
    const params = { locationIdList, agentIdList, itemIdList, exitIdList, creatureTemplateIdList };
    return Object.fromEntries(
        Object.entries(COMMANDS).map(([key, info]) => [
            key,
            info.tool(params)
        ])
    ) as Record<COMMAND_TYPE, AiTool>;
};

// Helper function to get synonyms
export const getCommandSynonyms = (command: COMMAND_TYPE): string[] => 
    COMMANDS[command]?.synonyms ?? [];

