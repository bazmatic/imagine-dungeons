import { AgentActor } from "@/actor/agent.actor";
import OpenAI from "openai";
import { AgentService } from "./Agent.service";
import { GameEventService } from "./GameEventService";
import { ExitService } from "./Exit.service";
import { ItemService } from "./Item.service";
import { Agent } from "@/entity/Agent";
import { ChatCompletionTool, FunctionDefinition } from "openai/resources";
import { GameEvent } from "@/entity/GameEvent";
import _ from "lodash";
import { LocationService } from "./Location.service";
import { Item } from "@/entity/Item";
import { ATTACK_AGENT_COMMAND, DROP_ITEM_COMMAND, EMOTE_COMMAND, GET_INVENTORY_COMMAND, GIVE_ITEM_TO_AGENT_COMMAND, GO_EXIT_COMMAND, LOOK_AROUND_COMMAND, LOOK_AT_AGENT_COMMAND, LOOK_AT_EXIT_COMMAND, LOOK_AT_ITEM_COMMAND, OpenAiCommand, PICK_UP_ITEM_COMMAND, REVEAL_EXIT_COMMAND, REVEAL_ITEM_COMMAND, SEARCH_LOCATION_COMMAND, SPEAK_TO_AGENT_COMMAND, UPDATE_AGENT_INTENT_COMMAND, UPDATE_AGENT_MOOD_COMMAND, UPDATE_ITEM_DESCRIPTION_COMMAND, WAIT_COMMAND } from "@/types/Tools";

export type EventDescription = {
    primary_text: string;
    extra_text?: string[];
};

export type AgentPromptContext = {
    calling_agent_id: string;
    location: {
        location_id: string;
        name: string;
        description: string;
    };
    exits: Array<{
        exit_id: string;
        description: string;
        direction: string;
    }>;
    items_present: Array<{
        item_id: string;
        name: string;
        description: string;
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
    }>;
};

type ToolCallArguments = {
    [COMMAND_TYPE.ATTACK_AGENT]: { target_agent_id: string };
    [COMMAND_TYPE.DROP_ITEM]: { item_id: string };
    [COMMAND_TYPE.EMOTE]: { emote_text: string };
    [COMMAND_TYPE.GET_INVENTORY]: object;
    [COMMAND_TYPE.GIVE_ITEM_TO_AGENT]: { item_id: string; target_agent_id: string };
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
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: { intent: string };
    [COMMAND_TYPE.UPDATE_AGENT_MOOD]: { mood: string };
    [COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]: { item_id: string; description: string };
    [COMMAND_TYPE.WAIT]: object;
};

export class Interpreter {
    private openai: OpenAI;
    private agentService: AgentService;
    private gameEventService: GameEventService;
    private exitService: ExitService;
    private itemService: ItemService;
    private locationService: LocationService

    constructor() {
        this.openai = new OpenAI();
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
        this.exitService = new ExitService();
        this.locationService = new LocationService();
        this.itemService = new ItemService();
    }

    private async getRefereeContext(locationId: string): Promise<AgentPromptContext> {
        const location = await this.locationService.getLocationById(locationId);
        const exits = await location.exits;
        const itemsPresentAtLocation = await location.items;
        const agentsPresent = await location.agents;
        const itemsOwnedByAgentsPresent = (await Promise.all(agentsPresent.map(agent => agent.items))).flat();
        const itemsPresent: Item[] = [...itemsPresentAtLocation, ...itemsOwnedByAgentsPresent];

        return {
            calling_agent_id: "system",
            location: {
                location_id: location.locationId,
                name: location.label,
                description: location.shortDescription
            },
            exits: exits.map(exit => ({
                exit_id: exit.exitId,
                description: exit.shortDescription,
                direction: exit.direction
            })),
            items_present: itemsPresent.map(item => ({
                item_id: item.itemId,
                name: item.label,
                hidden: item.hidden,
                description: item.shortDescription
            })),
            agents_present: agentsPresent.map(agent => ({
                agent_id: agent.agentId,
                name: agent.label,
                description: agent.longDescription
            })),
            inventory: []
        }
    }

    private async getContext(agentId: string): Promise<AgentPromptContext> {
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
                description: location.shortDescription
            },
            exits: exits.map(exit => ({
                exit_id: exit.exitId,
                description: exit.shortDescription,
                direction: exit.direction
            })),
            items_present: itemsPresent.map(item => ({
                item_id: item.itemId,
                name: item.label,
                hidden: item.hidden,
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
                description: item.shortDescription
            }))
        };
    }

    public async interpret(
        agentId: string,
        inputText: string
    ): Promise<GameEvent[]> {
        // Get the agent and check if they are dead
        const agentActor = new AgentActor(agentId);
        const agent: Agent = await agentActor.agent();
        if (agent.health <= 0) {
            return [];
        }

        // === Ask the AI what actions should be invoked based on the user's input ===

        // == Get the context ==
        const context: AgentPromptContext = await this.getContext(agentId);

        const content = {
            agent_command: inputText,
            context: `Here is the current context.
            It includes the calling agent, the location, the items present, the agents present, and the inventory of items owned by the calling agent.
            ${JSON.stringify(context, null, 4)}`
        };

        // == Get the OpenAI messages ==
        // System message: "You are an AI assistant that interprets the user's input and returns the appropriate tool calls."
        const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [{ role: "system", content: parserPrompt }];

        // User text input and context
        openAiMessages.push({ role: "user", content: JSON.stringify(content) });

        // -- Get the tools ==
        const tools = getOpenAiTools(agent, context);

        // Send the messages to OpenAI
        const response: OpenAI.Chat.Completions.ChatCompletion =
            await this.openai.chat.completions.create({
                model: "gpt-4o-2024-08-06",
                messages: openAiMessages,
                tools,
                tool_choice: "required"
                //seed: 101,
            });

        // == Parse the response to get the tool calls ==
        const toolCalls = response.choices[0]?.message.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            console.debug(JSON.stringify(response, null, 4));
            throw new Error("No tool calls found");
        }
        console.debug(`Tool calls: ${toolCalls.length}`);
        console.debug(`Choices: ${response.choices.length}`);

        const rawResponse = response.choices[0]?.message;
        if (!rawResponse) {
            throw new Error("No response content found");
        }

        // == Execute the tool calls to create game events ==
        const agentGameEvents: GameEvent[] = [];
        for (const toolCall of toolCalls) {
            if (toolCall.function.name === "multi_tool_use.parallel") {
                console.warn("multi_tool_use.parallel is not supported");
                continue;
            }
            const toolCallArguments = JSON.parse(toolCall.function.arguments);
            const commandType: COMMAND_TYPE = toolCall.function
                .name as COMMAND_TYPE;

            console.debug(
                `Calling ${commandType} with arguments ${JSON.stringify(
                    toolCallArguments
                )}`
            );

            const gameEvents = await this.  executeAgentToolCall(
                agentActor,
                commandType,
                toolCallArguments
            );

            console.debug(`Game events: ${gameEvents.length}`);

            agentGameEvents.push(...gameEvents);
        }

        const consequentGameEvents: GameEvent[] =
            await this.determineConsequentEvents(agentGameEvents);

        return [...agentGameEvents, ...consequentGameEvents];
    }

    private async executeRefereeToolCall(commandType: COMMAND_TYPE, toolCallArguments: ToolCallArguments[COMMAND_TYPE]): Promise<GameEvent[]> {
        switch (commandType) {
            case COMMAND_TYPE.REVEAL_ITEM:
                await this.itemService.revealItem(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_ITEM]).item_id
                );
                break;
            case COMMAND_TYPE.REVEAL_EXIT:
                await this.exitService.revealExit(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.REVEAL_EXIT]).exit_id
                );
                break;
            case COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION:
                await this.itemService.updateItemDescription(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]).item_id,
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION]).description
                );
                break;
            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
            
        }

        return [];
    }

    private async executeAgentToolCall(
        agentActor: AgentActor,
        commandType: COMMAND_TYPE,
        toolCallArguments: ToolCallArguments[COMMAND_TYPE]
    ): Promise<GameEvent[]> {
        let outputText: string[] = [];
        const agentId = await agentActor.agent().then(agent => agent.agentId);

        switch (commandType) {
            case COMMAND_TYPE.EMOTE:
                outputText = await agentActor.emote(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.EMOTE]).emote_text
                );
                break;

            case COMMAND_TYPE.GO_EXIT:
                outputText = await agentActor.goExit(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.GO_EXIT]).exit_id
                );
                break;
            case COMMAND_TYPE.PICK_UP_ITEM:
                outputText = await agentActor.pickUp(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.PICK_UP_ITEM]).item_id
                );
                break;
            case COMMAND_TYPE.DROP_ITEM:
                outputText = await agentActor.dropItem(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.DROP_ITEM]).item_id
                );
                break;
            case COMMAND_TYPE.LOOK_AT_ITEM:
                outputText = await agentActor.lookAtItem(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_ITEM]).item_id
                );
                break;
            case COMMAND_TYPE.LOOK_AT_AGENT:
                outputText = await agentActor.lookAtAgent(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_AGENT]).agent_id
                );
                break;
            case COMMAND_TYPE.LOOK_AROUND:
                outputText = await agentActor.lookAround();
                break;
            case COMMAND_TYPE.LOOK_AT_EXIT:
                outputText = await agentActor.lookAtExit(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.LOOK_AT_EXIT]).exit_id
                );
                break;
            case COMMAND_TYPE.SPEAK_TO_AGENT:
                outputText = await agentActor.speakToAgent(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.SPEAK_TO_AGENT]).target_agent_id,
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.SPEAK_TO_AGENT]).message
                );
                break;
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                outputText = await agentActor.updateAgentIntent(
                    agentId,
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_AGENT_INTENT]).intent
                );
                break;
            case COMMAND_TYPE.UPDATE_AGENT_MOOD:
                outputText = await agentActor.updateAgentMood(
                    agentId,
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.UPDATE_AGENT_MOOD]).mood
                );
                break;
            case COMMAND_TYPE.WAIT:
                outputText = await agentActor.wait();
                break;
            case COMMAND_TYPE.GIVE_ITEM_TO_AGENT:
                outputText = await agentActor.giveItemToAgent(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.GIVE_ITEM_TO_AGENT]).item_id,
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.GIVE_ITEM_TO_AGENT]).target_agent_id
                );
                break;
            case COMMAND_TYPE.GET_INVENTORY:
                outputText = await agentActor.getInventory();
                break;
            case COMMAND_TYPE.ATTACK_AGENT:
                outputText = await agentActor.attackAgent(
                    (toolCallArguments as ToolCallArguments[COMMAND_TYPE.ATTACK_AGENT]).target_agent_id
                );
                break;
            case COMMAND_TYPE.SEARCH_LOCATION:
                outputText = await agentActor.searchLocation();
                break;
            default:
                console.warn(`Unknown command type: ${commandType}`);
                return [];
        }

        const context = await this.getContext(agentId);
        const agentGameEvent: GameEvent =
            await this.gameEventService.makeGameEvent(
                agentId,
                context.location.location_id,
                "",  //No input text available here
                commandType,
                JSON.stringify(toolCallArguments),
                outputText.join("\n"),
                context.agents_present.map(agent => agent.agent_id)
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
            Your job is to determine what (if any) events should follow from these events.`;

            const recentEvents: EventDescription[] = (
                await Promise.all(
                    events.map(e => this.describeCommandResult(null, e))
                )
            ).filter(e => e !== null) as EventDescription[];
            if (recentEvents.length === 0) {
                continue;
            }
            const recentEventsPrompt = `The following events occurred in this round in this location:\n${recentEvents
                .map(e => `${e.primary_text}\n${e.extra_text?.join("\n")}`)
                .join("\n\n")}`;

            const context = await this.getRefereeContext(locationId);

            const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
                [
                    { role: "system", content: systemPrompt },
                    { role: "system", content: recentEventsPrompt },
                    { role: "system", content: `Here is the current context: ${JSON.stringify(context, null, 4)}` },
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
                throw new Error("No tool calls found");
            }

            for (const toolCall of toolCalls) {
                const toolCallArguments = JSON.parse(toolCall.function.arguments);
                const gameEvents: GameEvent[] = await this.executeRefereeToolCall(toolCall.function.name as COMMAND_TYPE, toolCallArguments);
                //const agentIds: string[] = eventsByLocation[locationId].map(e => e.agent_id).filter(id => id !== null) as string[];
                // const agentGameEvent: GameEvent = await this.gameEventService.makeGameEvent(
                //     null,
                //     "", // Note: inputText is not available here, consider passing it as a parameter if needed
                //     toolCall.function.name as COMMAND_TYPE,
                //     JSON.stringify(toolCallArguments),
                //     "",
                //     agentIds
                // );
                
                
                
                consequentGameEvents.push(...gameEvents);
            }
            //const context = await this.getContext(agentId);

    
        }
        return consequentGameEvents;
    }

    public async describeCommandResult(
        observerAgentId: string | null,
        gameEvent: GameEvent
        //hideDetails: boolean = false
    ): Promise<EventDescription | null> {
        const firstPerson = observerAgentId === gameEvent.agent_id;
        const parameters = JSON.parse(gameEvent.command_arguments);
    
        

        if (
            observerAgentId &&
            !gameEvent.agents_present?.includes(observerAgentId)
        ) {
            return null;
        }
        let primary_text: string = "";
        const actorLabel = gameEvent.agent_id ? await this.agentService.getAgentById(gameEvent.agent_id).then(agent => agent.label) : "system";
        const extra_text: string[] = [];
        const observerText = firstPerson ? "You" : actorLabel;
        const showExtraText = firstPerson || observerAgentId === null;
        switch (gameEvent.command_type) {
            case COMMAND_TYPE.EMOTE: {
                primary_text = `${gameEvent.output_text}`;
                break;
            }
            case COMMAND_TYPE.GO_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                primary_text = `${observerText} ${
                    firstPerson ? "go" : "goes"
                } ${exit.direction}.`;
                if (gameEvent.output_text && showExtraText) {
                    extra_text.push(gameEvent.output_text);
                }
                break;
            }
            case COMMAND_TYPE.PICK_UP_ITEM: {
                const item = await this.itemService.getItemById(
                    parameters.item_id
                );
                primary_text = `${observerText} ${
                    firstPerson ? "pick up" : "picks up"
                } the ${item.label}.`;
                break;
            }

            case COMMAND_TYPE.DROP_ITEM: {
                const item = await this.itemService.getItemById(
                    parameters.item_id
                );
                primary_text = `${observerText} ${
                    firstPerson ? "drop" : "drops"
                } the ${item.label}.`;
                break;
            }

            case COMMAND_TYPE.LOOK_AT_ITEM: {
                const item = await this.itemService.getItemById(
                    parameters.item_id
                );
                primary_text = `${observerText} ${
                    firstPerson ? "look at" : "looks at"
                } the ${item.label}.`;
                if (gameEvent.output_text && showExtraText) {
                    extra_text.push(gameEvent.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AT_AGENT: {
                const agent = await this.agentService.getAgentById(
                    parameters.agent_id
                );
                primary_text = `${observerText} ${
                    firstPerson ? "look at" : "looks at"
                } ${agent.label}.`;
                if (gameEvent.output_text && showExtraText) {
                    extra_text.push(gameEvent.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AROUND: {
                primary_text = `${observerText} ${
                    firstPerson ? "look around" : "looks around"
                }.`;
                if (gameEvent.output_text && showExtraText) {
                    extra_text.push(gameEvent.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AT_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                primary_text = `${observerText} ${
                    firstPerson ? "look at" : "looks at"
                } the ${exit.direction}.`;
                if (gameEvent.output_text && showExtraText) {
                    extra_text.push(gameEvent.output_text);
                }
                break;
            }

            case COMMAND_TYPE.SPEAK_TO_AGENT: {
                const targetAgent = await this.agentService.getAgentById(
                    parameters.target_agent_id
                );

                primary_text = `${observerText} ${
                    firstPerson ? "speak to" : "speaks to"
                } ${
                    parameters.target_agent_id === gameEvent.agent_id
                        ? "you"
                        : targetAgent.label
                }.`;
                if (gameEvent.output_text && showExtraText) {
                    extra_text.push(
                        `${observerText} ${firstPerson ? "say" : "says"}: "${
                            gameEvent.output_text
                        }"`
                    );
                }
                break;
            }
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                primary_text = `${observerText} ${
                    firstPerson ? "resolve" : "resolves"
                } to do something.`;
                if (gameEvent.output_text && firstPerson) {
                    extra_text.push(gameEvent.output_text);
                }
                break;

            case COMMAND_TYPE.UPDATE_AGENT_MOOD:
                primary_text = `${observerText} ${
                    firstPerson ? "feel" : "feels"
                }.`;
                break;

            case COMMAND_TYPE.WAIT:
                primary_text = `${observerText} ${
                    firstPerson ? "wait" : "waits"
                }.`;
                break;

            case COMMAND_TYPE.SEARCH_LOCATION: {
                const location = await this.locationService.getLocationById(parameters.location_id);
                primary_text = `${observerText} ${
                    firstPerson ? "search" : "searches"
                } ${location.label}.`;
                break;
            }

            case COMMAND_TYPE.GIVE_ITEM_TO_AGENT: {
                try {
                    const item = await this.itemService.getItemById(
                        parameters.item_id
                    );
                    const targetAgent = await this.agentService.getAgentById(
                        parameters.target_agent_id
                    );
                    primary_text = `${observerText} ${
                        firstPerson ? "give" : "gives"
                    } the ${item.label} to ${targetAgent.label}.`;
                } catch (error) {
                    console.error(error);
                    primary_text = `${observerText} ${
                        firstPerson ? "try to give" : "tries to give"
                    } something to someone, but it doesn't seem to work.`;
                }
                break;
            }

            case COMMAND_TYPE.GET_INVENTORY: {
                if (firstPerson && gameEvent.output_text) {
                    extra_text.push(gameEvent.output_text);
                } else {
                    primary_text = `${observerText} checks their inventory.`;
                }
                break;
            }

            case COMMAND_TYPE.ATTACK_AGENT: {
                const targetAgent = await this.agentService.getAgentById(
                    parameters.target_agent_id
                );
                primary_text = `${observerText} ${
                    firstPerson ? "attack" : "attacks"
                } ${targetAgent.label}.`;
                if (gameEvent.output_text) {
                    extra_text.push(gameEvent.output_text);
                }
                break;
            }
            case COMMAND_TYPE.SEARCH_LOCATION: {
                primary_text = `${observerText} ${
                    firstPerson ? "search" : "searches"
                } the current location.`;
                break;
            }
            case COMMAND_TYPE.SEARCH_ITEM: {
                const item = await this.itemService.getItemById(parameters.item_id);
                primary_text = `${observerText} ${firstPerson ? "search" : "searches"} the ${item.label}.`;
                break;
            }
            case COMMAND_TYPE.SEARCH_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                primary_text = `${observerText} ${firstPerson ? "search" : "searches"} the ${exit.direction}.`;
                break;
            }
            case COMMAND_TYPE.REVEAL_ITEM: {
                const item = await this.itemService.getItemById(parameters.item_id);
                primary_text = `A ${item.label} is revealed.`;
                break;
            }
            case COMMAND_TYPE.REVEAL_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                primary_text = `An exit to the ${exit.direction} is revealed.`;
                break;
            }
            case COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION: {
                const item = await this.itemService.getItemById(parameters.item_id);
                primary_text = `The ${item.label} has been changed.`;
                break;
            }


            default:
                console.warn(`Unknown command type: ${gameEvent.command_type}`);
        }

        return {
            primary_text,
            extra_text
        };
    }
}

const parserPrompt = `You are an AI assistant designed to turn an agent's natural language instructions into a series of actions that can be taken in a classic text adventure game.
You should return 2 or more actions.
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
`;

// export type AgentCommand = {
//     id: string;
//     openaiTool: FunctionDefinition;
// };

export enum COMMAND_TYPE {
    ATTACK_AGENT = "attack_agent",
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
    UPDATE_ITEM_DESCRIPTION = "update_item_description"
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
        WAIT_COMMAND,
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
        LOOK_AT_ITEM_COMMAND,
    ];

    const refereeCommands: OpenAiCommand[] = [
        REVEAL_ITEM_COMMAND,
        REVEAL_EXIT_COMMAND,
        UPDATE_ITEM_DESCRIPTION_COMMAND
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
    {
        type: "function",
        function: {
            name: COMMAND_TYPE.REVEAL_ITEM,
            description:
                "Change a hidden item to a visible item. This might happen if the user searches the location where the hidden item is. Do not use this to create new items.",
            parameters: {
                type: "object",
                properties: {
                    item_id: {
                        type: "string",
                        description:
                            "The id of the item to reveal. This must match item_id values listed in the items_present array of the context."
                    }
                },
                required: ["item_id"],
                additionalProperties: false
            }
        }
    },
    {
        type: "function",
        function: {
            name: COMMAND_TYPE.REVEAL_EXIT,
            description:
                "Change a hidden exit to a visible exit. This might happen if the user searches the location where the hidden exit is.",
            parameters: {
                type: "object",
                properties: {
                    exit_id: {
                        type: "string"
                    }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION,
            description:
                "Update the description of an item. This might happen something happens to the object that should be reflected in the description.",
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
    }
];