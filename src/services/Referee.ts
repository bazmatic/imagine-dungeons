import { Agent } from "@/entity/Agent";
import { GameEvent } from "@/entity/GameEvent";
import {
    COMMAND_TYPE,
    COMMANDS,
    createTools,
    ToolCallArguments
} from "@/types/commands";
import { AiTool, AiToolCall } from "@/types/types";
import _ from "lodash";
import { AgentService } from "./Agent.service";
import { getAiHelper, IAiHelper } from "./Ai/Ai";
import { ExitService } from "./Exit.service";
import { GameEventService } from "./GameEventService";
import { ItemService } from "./Item.service";
import { LocationService } from "./Location.service";
import { SYSTEM_AGENT } from "./Prompts";

export class Referee {
    private aiHelper: IAiHelper;

    constructor() {
        this.aiHelper = getAiHelper();
    }

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

        let toolCalls: AiToolCall[] = [];

        // == Check to see if the command is just one word and matches a command type ==
        const parsedToolCall: AiToolCall | null =
            this.parseCommand(instructions);
        if (parsedToolCall) {
            toolCalls = [parsedToolCall];
        } else {
            // === Ask the AI what actions should be invoked based on the user's input ===
            toolCalls = await this.aiHelper.interpretAgentInstructions(
                instructions,
                agent
            );
            for (const toolCall of toolCalls) {
                console.log(
                    `Tool call: ${toolCall.name} params: ${JSON.stringify(
                        toolCall.arguments
                    )}`
                );
            }
        }

        // == Execute the tool calls to create game events ==
        const agentGameEvents: GameEvent[] = [];
        for (const toolCall of toolCalls) {
            const commandType: COMMAND_TYPE = toolCall.name;
            let gameEvents: GameEvent[] = [];
            try {
                gameEvents = await this.executeAgentToolCall(
                    agent,
                    commandType,
                    toolCall.arguments
                );
            } catch (error: any) {
                console.error(
                    `Error executing tool call: ${toolCall.name}`,
                    error.message ?? error
                );
            }
            // Attach the instructions to the game event
            gameEvents.forEach(
                gameEvent => (gameEvent.input_text = instructions)
            );
            agentGameEvents.push(...gameEvents);
        }

        return [...agentGameEvents];
    }

    private parseCommand(instructions: string): AiToolCall | null {
        const verb = instructions.toLowerCase();

        // Check each command's synonyms
        for (const [commandType, commandInfo] of Object.entries(COMMANDS)) {
            if (commandInfo.synonyms.includes(verb)) {
                return {
                    name: commandType as COMMAND_TYPE,
                    arguments: {}
                };
            }
        }
        return null;
    }

    private async executeSystemToolCall(
        commandType: COMMAND_TYPE,
        toolCallArguments: ToolCallArguments[COMMAND_TYPE],
        locationId: string
    ): Promise<GameEvent[]> {
        const outputText: string[] = [];
        const agentService = new AgentService();
        const gameEventService = new GameEventService();
        const exitService = new ExitService();
        const itemService = new ItemService();
        const locationService = new LocationService();
        const location = await locationService.getLocationById(locationId);

        switch (commandType) {
            case COMMAND_TYPE.DO_NOTHING:
                return [];

            case COMMAND_TYPE.EVENT:
                outputText.push(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.EVENT])
                        .event_text
                );
                break;

            case COMMAND_TYPE.REVEAL_ITEM: {
                const { item_id } = toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_ITEM];
                const item = await itemService.getItemById(item_id);
                if (!item) {
                    throw new Error("That item doesn't exist.");
                }
                if (item.ownerItemId) {
                    throw new Error("That item is inside something else.");
                }
                if (!item.hidden) {
                    throw new Error("That item is not hidden.");
                }
                await itemService.revealItem(item_id);
                break;
            }

            case COMMAND_TYPE.REVEAL_EXIT: {
                const { exit_id } = toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_EXIT];
                await exitService.revealExit(exit_id);
                break;
            }

            case COMMAND_TYPE.UNLOCK_EXIT: {
                const { exit_id } = toolCallArguments as ToolCallArguments[COMMAND_TYPE.UNLOCK_EXIT];
                const exits = await location.exits;
                const exit = exits.find(e => e.exitId === exit_id);
                if (!exit) {
                    outputText.push("That is not an exit.");
                    break;
                }
                if (exit.locked) {
                    await exitService.unlockExit(exit_id);
                }
                break;
            }

            case COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION: {
                const { item_id, description } = toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION];
                const item = await itemService.getItemById(item_id);
                if (!item) {
                    outputText.push("That item doesn't exist.");
                    break;
                }
                await itemService.updateItemDescription(item_id, description);
                break;
            }

            case COMMAND_TYPE.SPAWN_AGENT: {
                const { template_id, location_id, name } = toolCallArguments as ToolCallArguments[COMMAND_TYPE.SPAWN_AGENT];
                await agentService.spawnAgentFromTemplate(
                    template_id,
                    location_id,
                    name
                );
                break;
            }

            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }

        const agentsPresent = await agentService.getAgentsByLocation(locationId);
        const gameEvent: GameEvent = await gameEventService.makeGameEvent(
            SYSTEM_AGENT.id,
            locationId,
            "",
            commandType,
            JSON.stringify(toolCallArguments),
            outputText.join("\n"),
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
            case COMMAND_TYPE.DISPLAY_HELP_TEXT:
                extraDetails = displayHelpText(agent);
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
                // const updatedAgent = await agentService.getAgentById(agentId);
                // extraDetails = await updatedAgent.lookAround();
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
                    ).container_item_id,
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
            // case COMMAND_TYPE.USE_ITEM:
            //     extraDetails = await agent.useItem(
            //         (
            //             toolCallArguments as ToolCallArguments[COMMAND_TYPE.USE_ITEM]
            //         ).item_id,
            //         (
            //             toolCallArguments as ToolCallArguments[COMMAND_TYPE.USE_ITEM]
            //         ).object_type,
            //         (
            //             toolCallArguments as ToolCallArguments[COMMAND_TYPE.USE_ITEM]
            //         ).object_id
            //     );
            //     break;
            case COMMAND_TYPE.WAIT:
                extraDetails = await agent.wait();
                break;
            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }
        const location = await agent.location;
        const agentsPresent = await agentService.getAgentsByLocation(
            location.locationId
        );
        const agentGameEvent: GameEvent = await gameEventService.makeGameEvent(
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
        //const aiHelper = new OllamaAiHelper(); //OpenAiHelper();

        const eventsByLocation: Record<string, GameEvent[]> = _.groupBy(
            agentGameEvents,
            "location_id"
        );

        const consequentGameEvents: GameEvent[] = [];
        for (const locationId in eventsByLocation) {
            const events = eventsByLocation[locationId];
            const locationToolCalls: AiToolCall[] =
                await this.aiHelper.determineConsequentEvents(
                    locationId,
                    events
                );
            for (const toolCall of locationToolCalls) {
                try {
                    const gameEvents: GameEvent[] =
                        await this.executeSystemToolCall(
                            toolCall.name as COMMAND_TYPE,
                            toolCall.arguments,
                            locationId
                        );
                    consequentGameEvents.push(...gameEvents);
                } catch (error: any) {
                    console.error(
                        `Error executing system tool call: ${toolCall.name}`,
                        error.message ?? error
                    );
                }
            }
        }
        return consequentGameEvents;
    }

    public calculateTotalImpact(events: GameEvent[]): number {
        const zeroImpactCommands = [
            COMMAND_TYPE.DISPLAY_HELP_TEXT,
            COMMAND_TYPE.DO_NOTHING,
            COMMAND_TYPE.GET_INVENTORY,
            COMMAND_TYPE.LOOK_AROUND,
            COMMAND_TYPE.LOOK_AT_AGENT,
            COMMAND_TYPE.LOOK_AT_EXIT,
            COMMAND_TYPE.LOOK_AT_ITEM,
            COMMAND_TYPE.WAIT,
        ];
        const result = events.reduce((sum, event) => {
            if (zeroImpactCommands.includes(event.command_type)) {
                return sum;
            }
            return sum + 1;
        }, 0);
        return result;
    }
}

export function getAvailableCommands(agent: Agent | null): COMMAND_TYPE[] {
    if (!agent) {
        return [
            COMMAND_TYPE.DO_NOTHING,
            COMMAND_TYPE.EVENT,
            COMMAND_TYPE.REVEAL_EXIT,
            COMMAND_TYPE.REVEAL_ITEM,
            COMMAND_TYPE.SPAWN_AGENT,
            COMMAND_TYPE.UNLOCK_EXIT,
            COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION
        ];
    }

    const commonCommands = [
        COMMAND_TYPE.ATTACK_AGENT,
        COMMAND_TYPE.DO_NOTHING,
        COMMAND_TYPE.DROP_ITEM,
        COMMAND_TYPE.EMOTE,
        COMMAND_TYPE.GET_ITEM_FROM_ITEM,
        COMMAND_TYPE.GIVE_ITEM_TO_AGENT,
        COMMAND_TYPE.GO_EXIT,
        COMMAND_TYPE.PICK_UP_ITEM,
        COMMAND_TYPE.SEARCH_ITEM,
        COMMAND_TYPE.SEARCH_LOCATION,
        COMMAND_TYPE.SPEAK_TO_AGENT,
        COMMAND_TYPE.WAIT
    ];

    if (agent.autonomous) {
        return [
            ...commonCommands,
            COMMAND_TYPE.UPDATE_AGENT_INTENT,
            COMMAND_TYPE.UPDATE_AGENT_MOOD
        ];
    }

    return [
        ...commonCommands,
        COMMAND_TYPE.GET_INVENTORY,
        COMMAND_TYPE.LOOK_AROUND,
        COMMAND_TYPE.LOOK_AT_AGENT,
        COMMAND_TYPE.LOOK_AT_EXIT,
        COMMAND_TYPE.LOOK_AT_ITEM
    ];
}

export function getAvailableTools(
    agent: Agent | null,
    locationIdList: string[],
    agentIdList: string[],
    itemIdList: string[],
    exitIdList: string[],
    creatureTemplateIdList: string[]
): AiTool[] {
    const availableCommands = getAvailableCommands(agent);
    const tools = createTools(
        locationIdList,
        agentIdList,
        itemIdList,
        exitIdList,
        creatureTemplateIdList
    );
    return availableCommands.map(commandType => tools[commandType]);
}

function displayHelpText(agent: Agent | null): string[] {
    const availableCommands = getAvailableCommands(agent);
    const result: string[] = ["Here is a list of things you can do:"];
    for (const command of availableCommands) {
        result.push(`- ${COMMANDS[command].description}`); //: ${COMMANDS[command].synonyms.join(", ")}`);
    }
    result.push("You can also try doing things not mentioned above.")
    return result;  
}
