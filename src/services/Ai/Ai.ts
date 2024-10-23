import OpenAI from "openai";
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall, ChatCompletionTool } from "openai/resources/chat/completions";
import Anthropic from '@anthropic-ai/sdk';

import { AiTool, AiToolCall } from "@/types/types";
import { GameEvent } from "@/entity/GameEvent";
import { getAvailableTools } from "../Referee";
import { getLocationContext, describeRecentEvents, interpretAgentInstructionsSystemPrompt, consequentEventsSystemPrompt, agentMakesInstructionsSystemPrompt } from "../Prompts";

import { COMMAND_TYPE, Tools } from "@/types/commands";
import { Agent } from "@/entity/Agent";
import { ContentBlock, ToolUseBlock } from "@anthropic-ai/sdk/resources";

export interface IAiHelper {
    interpretAgentInstructions(instructions: string, actingAgent: Agent): Promise<AiToolCall[]>;
    determineConsequentEvents(locationId: string, events: GameEvent[]): Promise<AiToolCall[]>;
    agentMakesInstructions(actingAgent: Agent): Promise<string>;
}


