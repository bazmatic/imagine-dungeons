
import { Agent } from "@/entity/Agent";
import { GameEvent } from "@/entity/GameEvent";
import { AiToolCall } from "@/types/types";
import { AnthropicAiHelper } from "./Anthropic";


export interface IAiHelper {
    interpretAgentInstructions(instructions: string, actingAgent: Agent): Promise<AiToolCall[]>;
    determineConsequentEvents(locationId: string, events: GameEvent[]): Promise<AiToolCall[]>;
    agentMakesInstructions(actingAgent: Agent): Promise<string>;
}


export const getAiHelper = () => new AnthropicAiHelper();

