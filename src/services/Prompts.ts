import { Agent, AgentDto } from "@/entity/Agent";
import { GameEvent } from "@/entity/GameEvent";
import { EventDescription } from "@/types/types";
import { OpenAI } from "openai";
import { ChatCompletionMessageParam, ChatCompletionMessageToolCall } from "openai/resources";
import { GameEventService } from "./GameEventService";
import { LocationService } from "./Location.service";
import { ItemDto } from "@/entity/Item";
import { LocationDto } from "@/entity/Location";
import { ExitDto } from "@/entity/Exit";
import _ from "lodash";
import { getAvailableTools } from "./Referee";
import { AgentService } from "./Agent.service";

const SEED = 100;

export type AgentPromptContext = {
    observer_agent: AgentDto;
    location: LocationDto;
    exits: ExitDto[];
    items_present: ItemDto[];
    autonomous_agents_present: AgentDto[];
    human_agents_present: AgentDto[];
    inventory?: ItemDto[];
};
export const SYSTEM_AGENT: AgentDto = {
    id: "system",
    label: "System",
    shortDescription: "The system",
    longDescription: "The system",
    locationId: "system"
};

// Return everything about the location that the observer agent can see
async function getLocationContext(
    locationId: string,
    observerAgent: Agent | null
): Promise<AgentPromptContext> {
    const isSystem = observerAgent === null;
    const locationService = new LocationService();
    const location: LocationDto = await (
        await locationService.getLocationById(locationId)
    ).toDto(isSystem);
    const observerAgentDto: AgentDto = isSystem
        ? SYSTEM_AGENT
        : await observerAgent.toDto(true);


    return {
        observer_agent: observerAgentDto,
        location,
        exits: location.exits,
        items_present: location.items,
        autonomous_agents_present: location.agents.filter(agent => agent.autonomous),
        human_agents_present: location.agents.filter(agent => !agent.autonomous),
        inventory: isSystem ? undefined : observerAgentDto.items
    };
}

// async function getAgentContext(observerAgent: Agent): Promise<AgentPromptContext> {
//     const isSystem = observerAgent === null;
//     const locationService = new LocationService();
//     const location: LocationDto = await (
//         await locationService.getLocationById(observerAgent.locationId)
//     ).toDto(isSystem);
//     const observerAgentDto: AgentDto = isSystem
//         ? SYSTEM_AGENT
//         : await observerAgent.toDto(true);

//     return {
//         observer_agent: observerAgentDto,
//         location,
//         exits: location.exits,
//         items_present: location.items,
//         autonomous_agents_present: location.agents.filter(agent => agent.autonomous),
//         human_agents_present: location.agents.filter(agent => !agent.autonomous),
//         inventory: observerAgentDto.items
//     };
// }

async function describeRecentEvents(
    agentId: string,
    count: number = 10
): Promise<string> {
    const gameEventService = new GameEventService();
    const recentEvents = await gameEventService.getRecentGameEvents(
        agentId,
        count
    );
    const recentEventDescriptions: EventDescription[] = [];
    for (const event of recentEvents) {
        const eventDescription = await event.describe(null); // Describe from the System's perspective
        if (eventDescription) {
            recentEventDescriptions.push(eventDescription);
        }
    }
    return `Here is what has happened so far:\n${recentEventDescriptions
        .map(e => `${e.general_description}\n${e.extra_detail?.join("\n")}`)
        .join("\n\n")}`;
}

function interpretAgentInstructionsSystemPrompt(): string {
    return `You are an AI assistant designed to turn an agent's natural language instructions into a series of actions that can be taken in a classic text adventure game.
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
}

async function agentMakesInstructionsSystemPrompt(
    agent: Agent
): Promise<string> {
    const location = await agent.location;
    const itemsPresent = await location.items;
    const agentsPresent = await location.agents;
    const inventory = await agent.items;
    return `You are acting as ${agent.label}, ${
        agent.longDescription
    }. You are actually an autonomous agent in a game but you won't reveal that. You must decide what to do based on the following information.\n
Your location: ${location.shortDescription}\n
Items present: ${itemsPresent.map(item => item.label).join(", ")}\n
Characters present: ${agentsPresent
        .filter(a => a.agentId !== agent.agentId)
        .map(a => a.label)
        .join(", ")}
    Your inventory: ${inventory.map(item => item.label).join(", ")}
    Your emotional state: You are feeling ${agent.mood}
    Your current intent: ${agent.currentIntent}
    Your long-term goal: ${agent.goal}
    Your backstory: ${agent.backstory}`;
}

function consequentEventsSystemPrompt(): string {
    return `You are a game master for a text adventure game.
    You will be given a list of events that occurred in the game.
    Your job is to determine what (if any) events should follow from these events.
    If an agent actively searches for hidden items, or your notes indicate that an action warrants it,
    you can choose to change a hidden item to a visible item.
    Do not reveal an item if the agent is simply looking around. Something special must have happened.
    Only autonomous agents should perform an emote.
    If you choose have an autonomousagent perform an emote, to indicate them doing something appropriate for the recent events, you must also include the agent_id of the agent performing the emote.
    If there are no relevant events, do not make any tool calls. Return an empty array.
    `;

}

// Given some natural language instructions, return a list of tool calls that can be made to execute the instructions
export async function interpetAgentInstructions(
    instructions: string,
    actingAgent: Agent
): Promise<ChatCompletionMessageToolCall[]> {
    const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
    const locationId = (await actingAgent.location).locationId;
    const context = await getLocationContext(locationId, actingAgent);




    //const context = await get
    const systemPrompt = interpretAgentInstructionsSystemPrompt();

    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "system", content: recentEventsMessage },
        {
            role: "system",
            content: `Here is what the agent can see: ${JSON.stringify(
                context,
                null,
                4
            )}`
        },
        {
            role: "system",
            content: `Here is what the agent said they want to do: ${instructions}`
        },
        {
            role: "user",
            content:
                "What minimal set of tool calls should be made to accurately carry out the actions that the agent should carry out based on the text description they provided? Respond with a list of tool calls that should be made. If nothing seems to fit well, just use an emote."
        }
    ];
    const openai = new OpenAI();
    const response: OpenAI.Chat.Completions.ChatCompletion =await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages,
        tools: getAvailableTools(actingAgent), // The tools will be different depending on the agent
        tool_choice: "required",
        seed: SEED
    });
    const toolCalls = response.choices[0]?.message.tool_calls?.filter(
        call => call.function.name !== "multi_tool_use.parallel"
    );
    if (!toolCalls || toolCalls.length === 0) {
        console.warn(JSON.stringify(response, null, 4));
        return [];
    }
    return toolCalls;
}

// Use a traditional parsing technique to determine the commands
async function basicCommandInterpreter(instructions: string, actingAgent: Agent): Promise<ChatCompletionMessageToolCall[]> {
    // The first word is a verb, the rest is a list of arguments
    // Clean up the text to remove punctuation and make it easier to parse
    const command = instructions.split(" ")[0].toLowerCase();
    const args = instructions.split(" ").slice(1);

    const commandLookup = getAvailableTools(actingAgent);
    const command = commandLookup.find(c => c.function.name === command);
    if (!command) {
        return [];
    }
    return [command];
 

}

export async function determineConsequentEventsInLocation(
    locationId: string,
    events: GameEvent[]
): Promise<ChatCompletionMessageToolCall[]> {
    const eventDescriptions: EventDescription[] = (
        await Promise.all(
            events.map(gameEvent => gameEvent.describe(null))
        )
    ).filter(e => e !== null) as EventDescription[];
    const context = await getLocationContext(locationId, null);
    const systemPrompt = consequentEventsSystemPrompt();

    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt},
        { role: "system", content: `The following events occurred in this round in this location:\n${eventDescriptions
            .map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`)
            .join("\n\n")}`},
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
                "What tool calls should be made to reflect the events that occurred at this location? Be sure to only unlock exits if an agent specifically performs an action to unlock the exit, and you believe this is the correct action to take. Respond with a list of tool calls that should be made. If no tool calls are necessary, return an empty array or the 'do nothing' tool."
        }
    ];
    const openai = new OpenAI();
    const response: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages,
        tools: getAvailableTools(null),
        tool_choice: "required",
        seed: SEED
    });
    console.log(JSON.stringify(response, null, 4));
    const toolCalls = response.choices[0]?.message.tool_calls?.filter(
        call => call.function.name !== "multi_tool_use.parallel"
    );
    if (!toolCalls || toolCalls.length === 0) {
        return [];
    }
    return toolCalls;
}

export async function agentMakesInstructions(
    actingAgent: Agent
): Promise<string> {
    const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
    const systemPrompt = await agentMakesInstructionsSystemPrompt(actingAgent);
    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
        { role: "system", content: recentEventsMessage }
    ];
    const openai = new OpenAI();
    messages.push({
        role: "user",
        content: `What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different.`
    });

    // Get the instructions from the agent
    const response = await openai.chat.completions.create({
        model: "gpt-4o-2024-08-06",
        messages,
        seed: SEED,
    });
    const choices = response.choices;
    if (!choices || choices.length === 0) {
        throw new Error("No choices from OpenAI");
    }

    const instructions = choices[0].message.content;
    if (!instructions) {
        throw new Error("No instructions found");
    }
    return instructions;
}
