import { FunctionDefinition } from "openai/resources";

export type EventDescription = {
    general_description: string;
    extra_detail?: string[];
};

export type AgentPromptContext = {
    calling_agent_id: string;
    location: {
        location_id: string;
        name: string;
        notes?: string;
        description: string;
    };
    exits: Array<{
        exit_id: string;
        description: string;
        locked: boolean;
        notes?: string;
        direction: string;
    }>;
    items_present: Array<{
        item_id: string;
        name: string;
        description: string;
        hidden: boolean;
        notes?: string;
    }>;
    agents_present: Array<{
        agent_id: string;
        name: string;
        description: string;
    }>;
    inventory: Array<{
        item_id: string;
        name: string;
        description: string;
        hidden: boolean;
    }>;
};

export type AgentCommand = {
    id: string;
    openaiTool: FunctionDefinition;
};

export enum COMMAND_TYPE {
    ATTACK_AGENT = "attack_agent",
    DO_NOTHING = "do_nothing",
    DROP_ITEM = "drop_item",
    EMOTE = "emote",
    GET_INVENTORY = "get_inventory",
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
    UPDATE_ITEM_DESCRIPTION = "update_item_description"
}

export type ToolCallArguments = {
    [COMMAND_TYPE.ATTACK_AGENT]: { target_agent_id: string };
    [COMMAND_TYPE.DROP_ITEM]: { item_id: string };
    [COMMAND_TYPE.DO_NOTHING]: object;
    [COMMAND_TYPE.EMOTE]: { emote_text: string; agent_id: string };
    [COMMAND_TYPE.GET_INVENTORY]: object;
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
    [COMMAND_TYPE.REVEAL_EXIT]: { exit_id: string };
    [COMMAND_TYPE.REVEAL_ITEM]: { item_id: string };
    [COMMAND_TYPE.SEARCH_EXIT]: { exit_id: string };
    [COMMAND_TYPE.SEARCH_ITEM]: { item_id: string };
    [COMMAND_TYPE.SEARCH_LOCATION]: { location_id: string };
    [COMMAND_TYPE.SPEAK_TO_AGENT]: { target_agent_id: string; message: string };
    [COMMAND_TYPE.UNLOCK_EXIT]: { exit_id: string };
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: { intent: string };
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: { mood: string };
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: {
        item_id: string;
        description: string;
    };
    [COMMAND_TYPE.WAIT]: object;
};


export type OpenAiCommand = {
    type: "function";
    function: {
        name: COMMAND_TYPE;
        description: string;
        parameters: {
            type: "object";
            properties: Record<string, unknown>;
            required?: string[];
            additionalProperties: boolean;
        };
    };
};
