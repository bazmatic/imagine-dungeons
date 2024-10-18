import OpenAI from "openai";
import { AgentService } from "./Agent.service";
import { GameEventService } from "./GameEventService";
import { ExitService } from "./Exit.service";
import { ItemService } from "./Item.service";
import { Agent } from "@/entity/Agent";
import { GameEvent } from "@/entity/GameEvent";
import _ from "lodash";
import { LocationService } from "./Location.service";
import { OpenAiCommand, ToolCallArguments } from "@/types/types";

import { COMMAND_TYPE } from "@/types/types";
import * as Commands from "@/types/commands";
import { determineConsequentEventsInLocation, interpetAgentInstructions, SYSTEM_AGENT } from "./Prompts";

export class Referee {

    constructor() {}
    
    /**
     * Instruct an agent to perform an action.
     * @param agentId The ID of the agent to instruct.
     * @param inputText The input text to instruct the agent with.
     * @returns The game events resulting from the agent's actions.
     */
    public async acceptAgentInstructions(
        agentId: string,
        instructions: string
    ): Promise<GameEvent[]> {
        // Get the agent and check if they are dead
        const agentService = new AgentService();
        const agent: Agent = await agentService.getAgentById(agentId);

        if (await agent.isDead()) {
            return [];
        }

        // === Ask the AI what actions should be invoked based on the user's input ===
        const toolCalls = await interpetAgentInstructions(instructions, agent);

        // == Execute the tool calls to create game events ==
        const agentGameEvents: GameEvent[] = [];
        for (const toolCall of toolCalls) {
            const toolCallArguments = JSON.parse(toolCall.function.arguments);
            const commandType: COMMAND_TYPE = toolCall.function.name as COMMAND_TYPE;
            const gameEvents = await this.executeAgentToolCall(
                agent,
                commandType,
                toolCallArguments
            );
            // Attach the instructions to the game event
            gameEvents.forEach(gameEvent => gameEvent.input_text = instructions);
            agentGameEvents.push(...gameEvents);
        }

        return [...agentGameEvents];
    }

    private async executeSystemToolCall(
        commandType: COMMAND_TYPE,
        toolCallArguments: ToolCallArguments[COMMAND_TYPE],
        locationId: string
    ): Promise<GameEvent[]> {
        let outputText: string[] = [];
        let actingAgent: Agent | null = null;
        const agentService = new AgentService();
        const gameEventService = new GameEventService();
        const exitService = new ExitService();
        const itemService = new ItemService();
        const locationService = new LocationService();
        const location = await locationService.getLocationById(locationId);

        switch (commandType) {
            case COMMAND_TYPE.DO_NOTHING:
                return [];
   
            case COMMAND_TYPE.REVEAL_ITEM:
                await itemService.revealItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.REVEAL_EXIT:
                await exitService.revealExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_EXIT]
                    ).exit_id
                );
                break;
            case COMMAND_TYPE.UNLOCK_EXIT:
                const exitId = (
                    toolCallArguments as ToolCallArguments[COMMAND_TYPE.UNLOCK_EXIT]
                ).exit_id;
                const exits = await location.exits;
                const exit = exits.find(e => e.exitId === exitId);
                if (!exit) {
                    outputText.push("That is not an exit.");
                    break;
                }
                if (exit.locked) {
                    await exitService.unlockExit(exitId);
                }
                break;
            case COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION:
                const itemId = (
                    toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]
                ).item_id;
                const item = await itemService.getItemById(itemId);
                if (!item) {
                    outputText.push("That item doesn't exist.");
                    break;
                }
                await itemService.updateItemDescription(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]
                    ).item_id,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]
                    ).description
                );
                break;

            case COMMAND_TYPE.DO_NOTHING:
                break;

            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }
        const agentsPresent = await agentService.getAgentsByLocation(
            locationId
        );

        const gameEvent: GameEvent = await gameEventService.makeGameEvent(
            SYSTEM_AGENT.id, //TODO: fetch the actual system agent from DB
            locationId,
            "", //No input text available here, as this is a system event
            commandType,
            JSON.stringify(toolCallArguments),
            outputText.join("\n"), //TODO: makeGameEvent should take an array of strings
            agentsPresent.map(agent => agent.agentId)
        );
        return [gameEvent];
    }

    private async executeAgentToolCall(
        agent: Agent,
        commandType: COMMAND_TYPE,
        toolCallArguments: ToolCallArguments[COMMAND_TYPE]
    ): Promise<GameEvent[]> {
        let extraDetails: string[] = [];
        const agentId = agent.agentId;
        const agentService = new AgentService();
        const gameEventService = new GameEventService();

        switch (commandType) {
            case COMMAND_TYPE.ATTACK_AGENT:
                extraDetails = await agent.attackAgent(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.ATTACK_AGENT]
                    ).target_agent_id
                );
                break;
            case COMMAND_TYPE.DO_NOTHING:
                break;
            case COMMAND_TYPE.DROP_ITEM:
                extraDetails = await agent.dropItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.DROP_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.EMOTE:
                extraDetails = await agent.emote(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.EMOTE])
                        .emote_text
                );
                break;
            case COMMAND_TYPE.GET_INVENTORY:
                extraDetails = await agent.getInventory();
                break;
            case COMMAND_TYPE.GIVE_ITEM_TO_AGENT:
                extraDetails = await agent.giveItemToAgent(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.GIVE_ITEM_TO_AGENT]
                    ).item_id,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.GIVE_ITEM_TO_AGENT]
                    ).target_agent_id
                );
                break;
            case COMMAND_TYPE.GO_EXIT:
                extraDetails = await agent.goExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.GO_EXIT]
                    ).exit_id
                );
                break;
            case COMMAND_TYPE.LOOK_AROUND:
                extraDetails = await agent.lookAround();
                break;
            case COMMAND_TYPE.LOOK_AT_AGENT:
                extraDetails = await agent.lookAtAgent(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_AGENT]
                    ).agent_id
                );
                break;
            case COMMAND_TYPE.LOOK_AT_EXIT:
                extraDetails = await agent.lookAtExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_EXIT]
                    ).exit_id
                );
                break;
            case COMMAND_TYPE.LOOK_AT_ITEM:
                extraDetails = await agent.lookAtItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.PICK_UP_ITEM:
                extraDetails = await agent.pickUp(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.PICK_UP_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.GET_ITEM_FROM_ITEM:
                extraDetails = await agent.getItemFromItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.GET_ITEM_FROM_ITEM]
                    ).item_id,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.GET_ITEM_FROM_ITEM]
                    ).target_item_id
                );
                break;
            case COMMAND_TYPE.SEARCH_ITEM:
                extraDetails = await agent.searchItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.SEARCH_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.SEARCH_LOCATION:
                extraDetails = await agent.searchLocation();
                break;
            case COMMAND_TYPE.SPEAK_TO_AGENT:
                extraDetails = await agent.speakToAgent(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.SPEAK_TO_AGENT]
                    ).target_agent_id,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.SPEAK_TO_AGENT]
                    ).message
                );
                break;
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                extraDetails = await agent.updateAgentIntent(
                    agentId,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_AGENT_INTENT]
                    ).intent
                );
                break;
            case COMMAND_TYPE.UPDATE_AGENT_MOOD:
                extraDetails = await agent.updateAgentMood(
                    agentId,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_AGENT_MOOD]
                    ).mood
                );
                break;
            case COMMAND_TYPE.WAIT:
                extraDetails = await agent.wait();
                break;
            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }
        const location = await agent.location;
        const agentsPresent = await agentService.getAgentsByLocation(location.locationId); 
        const agentGameEvent: GameEvent =
            await gameEventService.makeGameEvent(
                agentId,
                location.locationId,
                "", //No input text available here
                commandType,
                JSON.stringify(toolCallArguments),
                extraDetails.join("\n"),
                agentsPresent.map(agent => agent.agentId)
            );

        return [agentGameEvent];
    }

    // Now the AI will play the part of the DM and determine what events should follow, such as
    // - revealing new items
    // - changing item descriptions
    // - triggering new events
    // - etc.
    // TODO: This should also control autonomous agents

    public async determineConsequentEvents(
        agentGameEvents: GameEvent[]
    ): Promise<GameEvent[]> {

        const eventsByLocation: Record<string, GameEvent[]> = _.groupBy(
            agentGameEvents,
            "location_id"
        );

        const consequentGameEvents: GameEvent[] = [];
        for (const locationId in eventsByLocation) {
            const events = eventsByLocation[locationId];
            const locationToolCalls = await determineConsequentEventsInLocation(locationId, events);
            for (const toolCall of locationToolCalls) {
                const toolCallArguments = JSON.parse(toolCall.function.arguments);
                const gameEvents: GameEvent[] =
                    await this.executeSystemToolCall(
                        toolCall.function.name as COMMAND_TYPE,
                        toolCallArguments,
                        locationId
                );
                consequentGameEvents.push(...gameEvents);
            }
        }
        return consequentGameEvents;
    }
}

export function getAvailableCommands(
    agent: Agent | null,
): OpenAiCommand[] {
    const commonCommands: OpenAiCommand[] = [
        Commands.ATTACK_AGENT_COMMAND,
        Commands.DO_NOTHING_COMMAND,
        Commands.DROP_ITEM_COMMAND,
        Commands.EMOTE_COMMAND,
        Commands.GET_ITEM_FROM_ITEM_COMMAND,
        Commands.GIVE_ITEM_TO_AGENT_COMMAND,
        Commands.GO_EXIT_COMMAND,
        Commands.PICK_UP_ITEM_COMMAND,
        Commands.SEARCH_ITEM_COMMAND,
        Commands.SEARCH_LOCATION_COMMAND,
        Commands.SPEAK_TO_AGENT_COMMAND,
        Commands.WAIT_COMMAND,
    ];

    const autonomousCommands: OpenAiCommand[] = [
        Commands.UPDATE_AGENT_INTENT_COMMAND,
        Commands.UPDATE_AGENT_MOOD_COMMAND
    ];

    const nonAutonomousCommands: OpenAiCommand[] = [
        Commands.GET_INVENTORY_COMMAND,
        Commands.LOOK_AROUND_COMMAND,
        Commands.LOOK_AT_AGENT_COMMAND,
        Commands.LOOK_AT_EXIT_COMMAND,
        Commands.LOOK_AT_ITEM_COMMAND
    ];

    const refereeCommands: OpenAiCommand[] = [
        Commands.DO_NOTHING_COMMAND,
        Commands.REVEAL_EXIT_COMMAND,
        Commands.REVEAL_ITEM_COMMAND,
        Commands.UNLOCK_EXIT_COMMAND,
        Commands.UPDATE_ITEM_DESCRIPTION_COMMAND,
    ];

    if (!agent) {
        return refereeCommands;
    }
    if (!agent.autonomous) {
        return [...commonCommands, ...nonAutonomousCommands];
    } else {
        return [...commonCommands, ...autonomousCommands];
    }
}

// export function getOpenAiTools(
//     agent: Agent | null,
//     context: AgentPromptContext
// ): ChatCompletionTool[] {
//     const agentCommands: OpenAiCommand[] = getAgentCommands(agent, context);
//     return agentCommands.map(c => {
//         return {
//             type: "function",
//             function: {
//                 id: c.function.name,
//                 ...c.function
//             }
//         };
//     });
// }

// export const REFEREE_OPENAI_TOOLS: ChatCompletionTool[] = [
//     REVEAL_ITEM_COMMAND,
//     REVEAL_EXIT_COMMAND,
//     UPDATE_ITEM_DESCRIPTION_COMMAND,
//     EMOTE_COMMAND,
//     DO_NOTHING_COMMAND
// ];
