
import OpenAI from "openai";
import { AgentService } from "./Agent.service";
import { GameEventService } from "./GameEventService";
import { ExitService } from "./Exit.service";
import { ItemService } from "./Item.service";
import { Agent } from "@/entity/Agent";
import { ChatCompletionTool } from "openai/resources";
import { GameEvent } from "@/entity/GameEvent";
import _ from "lodash";
import { LocationService } from "./Location.service";
import { Item } from "@/entity/Item";
import { OpenAiCommand, ToolCallArguments } from "@/types/types";

import { AgentPromptContext, COMMAND_TYPE, EventDescription } from "@/types/types";
import { ATTACK_AGENT_COMMAND, DO_NOTHING_COMMAND, DROP_ITEM_COMMAND, EMOTE_COMMAND, GET_INVENTORY_COMMAND, GIVE_ITEM_TO_AGENT_COMMAND, GO_EXIT_COMMAND, LOOK_AROUND_COMMAND, LOOK_AT_AGENT_COMMAND, LOOK_AT_EXIT_COMMAND, LOOK_AT_ITEM_COMMAND, PICK_UP_ITEM_COMMAND, REVEAL_EXIT_COMMAND, REVEAL_ITEM_COMMAND, SEARCH_LOCATION_COMMAND, SPEAK_TO_AGENT_COMMAND, UPDATE_AGENT_INTENT_COMMAND, UPDATE_AGENT_MOOD_COMMAND, UPDATE_ITEM_DESCRIPTION_COMMAND, WAIT_COMMAND } from "@/types/commands";

export class Referee {
    private openai: OpenAI;
    private agentService: AgentService;
    private gameEventService: GameEventService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService;

    constructor() {
        this.openai = new OpenAI();
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
        this.exitService = new ExitService();
        this.locationService = new LocationService();
        this.itemService = new ItemService();
    }

    private async getRefereeContext(
        locationId: string
    ): Promise<AgentPromptContext> {
        const loc = await this.locationService.getLocationById(locationId);
        const exits = await loc.exits;
        const itemsPresentAtLocation = await loc.items;
        const agentsPresent = await loc.agents;
        const itemsOwnedByAgentsPresent = (
            await Promise.all(agentsPresent.map(agent => agent.items))
        ).flat();
        const itemsPresent: Item[] = [
            ...itemsPresentAtLocation,
            ...itemsOwnedByAgentsPresent
        ];

        return {
            calling_agent_id: "system",
            location: {
                location_id: loc.locationId,
                name: loc.label,
                notes: loc.notes,
                description: loc.shortDescription
            },
            exits: exits.map(exit => ({
                exit_id: exit.exitId,
                description: exit.shortDescription,
                locked: exit.locked,
                notes: exit.notes,
                direction: exit.direction
            })),
            items_present: itemsPresent.map(item => ({
                item_id: item.itemId,
                name: item.label,
                notes: item.notes,
                hidden: item.hidden,
                description: item.shortDescription
            })),
            agents_present: agentsPresent.map(agent => ({
                agent_id: agent.agentId,
                name: agent.label,
                description: agent.longDescription
            })),
            inventory: []
        };
    }

    private async getContext(
        agentId: string,
        includeNotes: boolean = false
    ): Promise<AgentPromptContext> {
        const agent = await this.agentService.getAgentById(agentId);
        const location = await agent.location;
        const exits = await location.exits;
        const inventory = await agent.items;
        const itemsPresent = await location.items;
        const agentsPresent = await location.agents;

        return {
            calling_agent_id: agentId,
            location: {
                location_id: location.locationId,
                name: location.label,
                notes: includeNotes ? location.notes : undefined,
                description: location.shortDescription
            },
            exits: exits.map(exit => ({
                exit_id: exit.exitId,
                description: exit.shortDescription,
                direction: exit.direction,
                locked: exit.locked,
                notes: includeNotes ? exit.notes : undefined
            })),
            items_present: itemsPresent.map(item => ({
                item_id: item.itemId,
                name: item.label,
                hidden: item.hidden,
                notes: includeNotes ? item.notes : undefined,
                description: item.shortDescription
            })),
            agents_present: agentsPresent.map(agent => ({
                agent_id: agent.agentId,
                name: agent.label,
                description: agent.longDescription
            })),
            inventory: inventory.map(item => ({
                item_id: item.itemId,
                name: item.label,
                hidden: item.hidden,
                notes: includeNotes ? item.notes : undefined,
                description: item.shortDescription
            }))
        };
    }

    private async getAgentToolCalls(
        agent: Agent,
        inputText: string
    ): Promise<OpenAI.Chat.Completions.ChatCompletionMessageToolCall[]> {
        // == Get the context ==
        const context: AgentPromptContext = await this.getContext(
            agent.agentId
        );

        const content = {
            agent_command: inputText,
            context: `Here is the current context.
            It includes the calling agent, the location, the items present, the agents present, and the inventory of items owned by the calling agent.
            ${JSON.stringify(context, null, 4)}`
        };

        // == Get the OpenAI messages ==

        const parserPrompt = `You are an AI assistant designed to turn an agent's natural language instructions into a series of actions that can be taken in a classic text adventure game.
        The agent is embedded in a game world with locations connected by exits.
        Locations contain items and other agents.
        Your agent is represented by calling_agent_id.
        Your agent can move through exits, represented by exit_id.
        Your agent can pick up items, represented by item_id.
        Your agent can drop items, represented by item_id.
        Your agent can look at items, represented by item_id.
        Your agent can look at other agents, represented by agent_id.
        Your agent can speak to other agents, represented by agent_id.
        Your agent can update their intent, represented by intent.
        Your agent can wait.
        Your agent can give items to other agents, represented by target_agent_id.
        You are calling the function in the context of a specific agent represented by calling_agent_id.
        You should call multiple functions, especially if the user's input seems to require it.
        If the user's input does not clearly call for one of the functions below, then call emote or wait.
        If the agent's input starts with quotation marks, or doesn't seem to match any of the available tools, send the text verbatim to speak_to_agent to speak to an agent that is present in the same location.
        If the agent attempts to do something that shouldn't be allowed, such as going through a locked exit, then use emote to make the agent look confused.
        `;
        
        // System message: "You are an AI assistant that interprets the user's input and returns the appropriate tool calls."
        const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [{ role: "system", content: parserPrompt }];

        // User text input and context
        openAiMessages.push({ role: "user", content: JSON.stringify(content) });

        // Get recent events
        // TODO: Make a function to do this so it can be reused
        const recentEvents = await this.gameEventService.getRecentGameEvents(agent.agentId, 10);
        const recentEventDescriptions: EventDescription[] = (
            await Promise.all(
                recentEvents.map(gameEvent => gameEvent.describe(agent))
            )
        ).filter(e => e !== null) as EventDescription[];
        const recentEventsPrompt = `The following events occurred in this round in this location:\n${recentEventDescriptions
            .map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`)
            .join("\n\n")}`;
        openAiMessages.push({ role: "system", content: recentEventsPrompt });
        // -- Get the tools ==
        const tools = getOpenAiTools(agent, context);

        // Send the messages to OpenAI
        const response: OpenAI.Chat.Completions.ChatCompletion =
            await this.openai.chat.completions.create({
                model: "gpt-4o-2024-08-06",
                messages: openAiMessages,
                tools,
                tool_choice: "auto",
                seed: 101
            });

        // == Parse the response to get the tool calls ==
        const toolCalls = response.choices[0]?.message.tool_calls?.filter(
            call => call.function.name !== "multi_tool_use.parallel"
        );
        if (!toolCalls || toolCalls.length === 0) {
            console.debug(JSON.stringify(response, null, 4));
            return []; // TODO: Default action. Look confused?
        }
        console.debug(`Tool calls: ${toolCalls.length}`);
        console.debug(`Choices: ${response.choices.length}`);

        const rawResponse = response.choices[0]?.message;
        if (!rawResponse) {
            throw new Error("No response content found");
        }

        return toolCalls;
    }

    /**
     * Instruct an agent to perform an action.
     * @param agentId The ID of the agent to instruct.
     * @param inputText The input text to instruct the agent with.
     * @returns The game events resulting from the agent's actions.
     */
    public async acceptAgentInstructions(
        agentId: string,
        inputText: string
    ): Promise<GameEvent[]> {
        // Get the agent and check if they are dead
        const agent: Agent = await this.agentService.getAgentById(agentId);

        if (await agent.isDead()) {
            return [];
        }

        // === Ask the AI what actions should be invoked based on the user's input ===
        const toolCalls = await this.getAgentToolCalls(agent, inputText);

        // == Execute the tool calls to create game events ==
        const agentGameEvents: GameEvent[] = [];
        for (const toolCall of toolCalls) {
            const toolCallArguments = JSON.parse(toolCall.function.arguments);
            const commandType: COMMAND_TYPE = toolCall.function
                .name as COMMAND_TYPE;

            console.debug(
                `Calling ${commandType} with arguments ${JSON.stringify(
                    toolCallArguments
                )}`
            );

            const gameEvents = await this.executeAgentToolCall(
                agent,
                commandType,
                toolCallArguments
            );

            agentGameEvents.push(...gameEvents);
        }

        return [...agentGameEvents];
    }

    private async executeRefereeToolCall(
        commandType: COMMAND_TYPE,
        toolCallArguments: ToolCallArguments[COMMAND_TYPE],
        locationId: string
    ): Promise<GameEvent[]> {
        let outputText: string[] = [];
        let actingAgentId: string = "system";

        switch (commandType) {
            case COMMAND_TYPE.DO_NOTHING:
                return [];
            case COMMAND_TYPE.REVEAL_ITEM:
                await this.itemService.revealItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.REVEAL_EXIT:
                await this.exitService.revealExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_EXIT]
                    ).exit_id
                );
                break;
            case COMMAND_TYPE.UNLOCK_EXIT:
                await this.exitService.unlockExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UNLOCK_EXIT]
                    ).exit_id
                );
                break;
            case COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION:
                await this.itemService.updateItemDescription(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]
                    ).item_id,
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]
                    ).description
                );
                break;
            case COMMAND_TYPE.EMOTE:
                const agent = await this.agentService.getAgentById(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.EMOTE])
                        .agent_id
                );
                outputText = await agent.emote(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.EMOTE])
                        .emote_text
                );
                actingAgentId = agent.agentId;
                break;
            case COMMAND_TYPE.DO_NOTHING:
                break;

            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }
        const agentsPresent = await this.agentService.getAgentsByLocation(
            locationId
        );

        const gameEvent: GameEvent =
        await this.gameEventService.makeGameEvent(
            actingAgentId,
            locationId,
            "", //No input text available here, as this is a system event
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

        switch (commandType) {
            case COMMAND_TYPE.EMOTE:
                extraDetails = await agent.emote(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.EMOTE])
                        .emote_text
                );
                break;
            case COMMAND_TYPE.DO_NOTHING:
                break;
            case COMMAND_TYPE.GO_EXIT:
                extraDetails = await agent.goExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.GO_EXIT]
                    ).exit_id
                );
                break;
            case COMMAND_TYPE.PICK_UP_ITEM:
                extraDetails = await agent.pickUp(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.PICK_UP_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.DROP_ITEM:
                extraDetails = await agent.dropItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.DROP_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.LOOK_AT_ITEM:
                extraDetails = await agent.lookAtItem(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_ITEM]
                    ).item_id
                );
                break;
            case COMMAND_TYPE.LOOK_AT_AGENT:
                extraDetails = await agent.lookAtAgent(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_AGENT]
                    ).agent_id
                );
                break;
            case COMMAND_TYPE.LOOK_AROUND:
                extraDetails = await agent.lookAround();
                break;
            case COMMAND_TYPE.LOOK_AT_EXIT:
                extraDetails = await agent.lookAtExit(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_EXIT]
                    ).exit_id
                );
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
            case COMMAND_TYPE.GET_INVENTORY:
                extraDetails = await agent.getInventory();
                break;
            case COMMAND_TYPE.ATTACK_AGENT:
                extraDetails = await agent.attackAgent(
                    (
                        toolCallArguments as ToolCallArguments[COMMAND_TYPE.ATTACK_AGENT]
                    ).target_agent_id
                );
                break;
            case COMMAND_TYPE.SEARCH_LOCATION:
                extraDetails = await agent.searchLocation();
                break;
            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }

        //const context = await this.getContext(agentId);
        const location = await agent.location;
        const agentsPresent = await this.agentService.getAgentsByLocation(location.locationId);
        
        const agentGameEvent: GameEvent =
            await this.gameEventService.makeGameEvent(
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

    public async determineConsequentEvents(
        agentGameEvents: GameEvent[]
    ): Promise<GameEvent[]> {
        // Now the AI will play the part of the DM and determine what events should follow, such as
        // - revealing new items
        // - chainging item descriptions
        // - triggering new events
        // - etc.

        // Break the events up into groups by location
        const eventsByLocation: Record<string, GameEvent[]> = _.groupBy(
            agentGameEvents,
            "location_id"
        );

        const consequentGameEvents: GameEvent[] = [];

        for (const locationId in eventsByLocation) {
            const events = eventsByLocation[locationId];

            const systemPrompt = `You are a game master for a text adventure game.
            You will be given a list of events that occurred in the game.
            Your job is to determine what (if any) events should follow from these events.
            If an agent actively searches for hidden items, or your notes indicate that an action warrants it,
            you can choose to change a hidden item to a visible item.
            Do not reveal an item if the agent is simply looking around. Something special must have happened.
            If you choose have an agent perform an emote, to indicate them doing something appropriate for the recent events, you must also include the agent_id of the agent performing the emote.
            If there are no relevant events, do not make any tool calls. Return an empty array.
            `;

            const recentEventDescriptions: EventDescription[] = (
                await Promise.all(
                    events.map(gameEvent => gameEvent.describe(null))
                )
            ).filter(e => e !== null) as EventDescription[];

            if (recentEventDescriptions.length === 0) {
                continue;
            }
            const recentEventsPrompt = `The following events occurred in this round in this location:\n${recentEventDescriptions
                .map(e => `${e.general_description}\n${e.extra_detail?.join("\n")}`)
                .join("\n\n")}`;

            const context = await this.getRefereeContext(locationId);

            const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
                [
                    { role: "system", content: systemPrompt },
                    { role: "system", content: recentEventsPrompt },
                    {
                        role: "system",
                        content: `Here is the current context: ${JSON.stringify(
                            context,
                            null,
                            4
                        )}`
                    },
                    {
                        role: "user",
                        content:
                            "What tool calls should be made to reflect the events that occurred at this location? Respond with a list of tool calls that should be made."
                    }
                ];

            const response: OpenAI.Chat.Completions.ChatCompletion =
                await this.openai.chat.completions.create({
                    model: "gpt-4o-2024-08-06",
                    messages: openAiMessages,
                    tools: REFEREE_OPENAI_TOOLS,
                    tool_choice: "required"
                });
            const toolCalls = response.choices[0]?.message.tool_calls;
            if (!toolCalls || toolCalls.length === 0) {
                console.warn(JSON.stringify(response, null, 4));
                return [];
            }

            for (const toolCall of toolCalls) {
                const toolCallArguments = JSON.parse(
                    toolCall.function.arguments
                );
                const gameEvents: GameEvent[] =
                    await this.executeRefereeToolCall(
                        toolCall.function.name as COMMAND_TYPE,
                        toolCallArguments,
                        locationId
                    );

                consequentGameEvents.push(...gameEvents);
            }
            //const context = await this.getContext(agentId);
        }
        return consequentGameEvents;
    }
}


export function getAgentCommands(
    agent: Agent | null,
    _context: AgentPromptContext
): OpenAiCommand[] {
    const commonCommands: OpenAiCommand[] = [
        ATTACK_AGENT_COMMAND,
        DROP_ITEM_COMMAND,
        EMOTE_COMMAND,
        GIVE_ITEM_TO_AGENT_COMMAND,
        GO_EXIT_COMMAND,
        PICK_UP_ITEM_COMMAND,
        SEARCH_LOCATION_COMMAND,
        SPEAK_TO_AGENT_COMMAND,
        WAIT_COMMAND
    ];

    const autonomousCommands: OpenAiCommand[] = [
        UPDATE_AGENT_INTENT_COMMAND,
        UPDATE_AGENT_MOOD_COMMAND
    ];

    const nonAutonomousCommands: OpenAiCommand[] = [
        GET_INVENTORY_COMMAND,
        LOOK_AROUND_COMMAND,
        LOOK_AT_AGENT_COMMAND,
        LOOK_AT_EXIT_COMMAND,
        LOOK_AT_ITEM_COMMAND
    ];

    const refereeCommands: OpenAiCommand[] = [
        REVEAL_ITEM_COMMAND,
        REVEAL_EXIT_COMMAND,
        UPDATE_ITEM_DESCRIPTION_COMMAND,
        EMOTE_COMMAND
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

export function getOpenAiTools(
    agent: Agent | null,
    context: AgentPromptContext
): ChatCompletionTool[] {
    const agentCommands: OpenAiCommand[] = getAgentCommands(agent, context);
    return agentCommands.map(c => {
        return {
            type: "function",
            function: {
                id: c.function.name,
                ...c.function
            }
        };
    });
}

export const REFEREE_OPENAI_TOOLS: ChatCompletionTool[] = [
    REVEAL_ITEM_COMMAND,
    REVEAL_EXIT_COMMAND,
    UPDATE_ITEM_DESCRIPTION_COMMAND,
    EMOTE_COMMAND,
    DO_NOTHING_COMMAND
];
