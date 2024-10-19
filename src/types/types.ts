import { FunctionDefinition } from "openai/resources";
import { COMMAND_TYPE } from "./commands";

export type EventDescription = {
    general_description: string;
    extra_detail?: string[];
};

export type AgentCommand = {
    id: string;
    openaiTool: FunctionDefinition;
};

export type AiTool = {
    name: COMMAND_TYPE;
    description: string;
    parameters: Record<string, unknown>;
};

export type AiToolCall = {
    name: COMMAND_TYPE;
    arguments: Record<string, unknown>;
};
