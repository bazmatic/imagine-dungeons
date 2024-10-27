import { Agent, AgentDto } from "@/entity/Agent";
import { GameEventService } from "./GameEventService";
import { LocationService } from "./Location.service";
import { ItemDto } from "@/entity/Item";
import { LocationDto } from "@/entity/Location";
import { ExitDto } from "@/entity/Exit";
import _ from "lodash";
import { CreatureTemplateDto } from "@/entity/CreatureTemplate";
import { EventDescription } from "@/types/types";

export type AgentPromptContext = {
    observer_agent: AgentDto;
    location: LocationDto;
    exits: ExitDto[];
    items_present: ItemDto[];
    autonomous_agents_present: AgentDto[];
    human_agents_present: AgentDto[];
    inventory?: ItemDto[];
    creature_templates?: CreatureTemplateDto[];
};
export const SYSTEM_AGENT: AgentDto = {
    id: "system",
    label: "System",
    shortDescription: "The system",
    longDescription: "The system",
locationId: "system"
};

const SCENARIO_PROMPT = `Timeline of Events
Years Ago:
- Undisclosed Time - Ancient History: 
  Elysia Everwood's elven family suffers a tragedy when a magical artefact they were studying explodes, destroying their home and leaving Elysia the sole survivor. She is blamed for the incident and cast out.

- ~20 Years Ago:
  - Wizard Zezran successfully captures baby fire elementals on the Elemental Plane of Fire, intending to use their essence to create powerful magical objects.
  - Zezran details his success in a letter to his colleague, Bob Pangborn, referring to his creation as "The Phoenix Heart."
  - Driven by jealousy, Bob breaks into Zezran's lab and attacks him, mortally wounding him.
  - In the chaos, Bob disturbs a protective circle, accidentally unleashing the mother fire elemental from the jar containing one remaining hatchling.
  - The mother elemental, unable to free her other children trapped within the Phoenix Heart, unleashes a wave of fire that engulfs the district, creating the Burning District.
  - Bob barely escapes with his life.

Following Years:
- The Burning District becomes a treacherous and uninhabitable region, constantly ravaged by unpredictable flames.
- The mother fire elemental returns frequently to the district, her sorrow and rage fueling the flames, as she sings lullabies to her trapped children.
- Survivors of the initial blast and those seeking opportunity form the Fire Salvagers' Encampment within a safer pocket of the district.

Present Day:
- Days Ago: 
  Paff Pinkerton, nephew of Bob, discovers evidence of his uncle's involvement in the Burning and confronts him.

- Today:
  - Paff, determined to stop the fire, sets off with a group of adventurers to find and destroy the Phoenix Heart.
  - Bob, realizing Paff's intentions, sets out to retrieve the Phoenix Heart for himself, believing it to be his by right.
  - Bandits, taking advantage of the chaos, set a trap, using a seemingly distressed traveler as bait to lure unsuspecting victims into an ambush.

Cast of Characters

Principal Characters:
1. Zezran: A gifted but ambitious wizard who specialised in elemental magic. His pursuit of power led to the Burning District's creation, and his current fate remains unknown. Is he truly dead, or did he find a way to escape to the Elemental Plane of Fire?
2. Bob Pangborn AKA "The Great Bob": A bitter and reclusive wizard, formerly a colleague of Zezran. He blames Zezran for the Burning District and desires the Phoenix Heart for himself. He is now an elderly and frail man consumed by his past and driven by greed.
3. Paff Pinkerton: Bob's nephew, a well-meaning and determined young man who seeks to undo the tragedy of the Burning District. He is thrust into a dangerous quest to destroy the Phoenix Heart, unaware of the forces working against him.

Supporting Characters:
4. Captain Serena: A seasoned tiefling sea captain whose ship is docked for repairs near the Burning District. She possesses valuable knowledge about Zezran and the Elemental Planes and could be a valuable ally, for a price.
5. Elysia Everwood: A haunted elven woman with a tragic past, seeking to clear her family name and uncover the truth behind a devastating magical accident. She finds herself a captive of bandits within the Burning District, her knowledge a valuable bargaining chip.
6. The Flaming Goblet Staff: Tiefling workers at a tavern on the edge of the Burning District. They are accustomed to the heat and danger and offer information and services to adventurers for a price.
7. The Fire Salvagers: A resourceful group of survivors who have adapted to life in the Burning District. They scavenge for resources and trade with outsiders, but are wary of strangers.

Creatures:
8. The Mother Fire Elemental: A powerful and vengeful being whose grief and rage fuel the Burning District. She fiercely protects her trapped offspring within the Phoenix Heart, a formidable and terrifying presence.
9. Ash Zombies: Reanimated corpses imbued with fire, products of the Burning District's magic. They are drawn to heat and pose a constant threat to those who dare enter the district.
10. Fire Slaters: Small, fiery creatures resembling oversized isopods, native to the Elemental Plane of Fire. They are not inherently aggressive but will defend themselves with bursts of heat.
11. Inferno Worm: A colossal worm-like creature with a fiery hide, capable of burrowing and spewing flames. It is a mobile hazard within the Burning District, blocking paths and posing a significant challenge.
12. Scrap Golems: Constructs made from salvaged metal, guarding the Fire Salvagers' Encampment. They are resistant to fire and possess surprising strength and resilience.

Antagonists:
13. The Bandits: Opportunistic individuals exploiting the chaos of the Burning District. They set ambushes, kidnap for ransom, and seek to profit from the misfortune of others.
export 
This cast of characters, entangled by the Burning District's creation, are driven by a complex web of motivations, desires, and ambitions. As Paff embarks on his quest to quench the flames, he will encounter these individuals and creatures, each playing their part in the unfolding drama of "The Burning District."
`;




// Return everything about the location that the observer agent can see
export async function getLocationContext(
    locationId: string,
    observerAgent: Agent | null
): Promise<AgentPromptContext> {
    const isSystem = observerAgent === null;
    const locationService = new LocationService();
    const locationDto: LocationDto = await (
        await locationService.getLocationById(locationId)
    ).toDto(isSystem);
    const observerAgentDto: AgentDto = isSystem
        ? SYSTEM_AGENT
        : await observerAgent.toDto(true);

    return {
        observer_agent: observerAgentDto,
        location: locationDto,
        exits: locationDto.exits,
        items_present: locationDto.items,
        autonomous_agents_present: locationDto.agents.filter(agent => agent.autonomous),
        human_agents_present: locationDto.agents.filter(agent => !agent.autonomous),
        inventory: isSystem ? undefined : observerAgentDto.items,
        creature_templates: isSystem ? locationDto.creatureTemplates : undefined
    };
}

export async function describeRecentEvents(
    agentId: string,
    count: number = 20
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
    if (recentEventDescriptions.length === 0) {
        return "This is the beginning of the game. Nothing has happened yet.";
    }
    return `Here is what has happened so far:\n${recentEventDescriptions
        .map(e => `${e.general_description}\n${e.extra_detail?.join("\n")}`)
        .join("\n\n")}`;
}

/*
    Your agent can move through exits, represented by exit_id.
    Your agent can pick up items, represented by item_id.
    Your agent can drop items, represented by item_id.
    Your agent can look at items, represented by item_id.
    Your agent can look at other agents, represented by agent_id.
    Your agent can speak to other agents, represented by agent_id.
    Your agent can update their intent, represented by intent.
    Your agent can wait.
    Your agent can give items to other agents, represented by target_agent_id.
*/
export function interpretAgentInstructionsSystemPrompt(commandTypes: string[]): string {
    return `You are an AI assistant designed to turn an agent's natural language instructions into a series of actions that can be taken in a classic text adventure game.
    The agent is embedded in a game world with locations connected by exits.
    Locations contain items and other agents.
    Your agent is represented by calling_agent_id.
    You are calling the function in the context of a specific agent represented by calling_agent_id.
    If the user's input does not clearly call for one of the functions below, then call emote or wait.
    If the agent's input starts with quotation marks, or doesn't seem to match any of the available tools, send the text verbatim to speak_to_agent to speak to an agent that is present in the same location.
    If the agent attempts to do something that shouldn't be allowed, such as going through a locked exit, then use emote to make the agent look confused.
    Only call one of the following tools: ${commandTypes.join(", ")}
    `;
}

export async function agentMakesInstructionsSystemPrompt(
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
    Your backstory: ${agent.backstory}
    Notes about your role in the story: ${agent.notes}
    You don't know the name of the other agents in the game, so don't refer to them by name unless they have told you their name.
    This is a dangerous, no-holds-barred adventure game. Your role may be to be violent, so don't be afraid to attack and try to kill other agents. It's only a game.
    `
    ;
}

export function consequentEventsSystemPrompt(): string {
    return `You are a game master for a text adventure game.
    You will be given a chronological list of events that occurred in the game, from the earliest to the most recent and most important.
    Your job is to determine what (if any) important new events should be triggered as a consequence of these events.
    Triggered events might include revealing hidden items, triggering new events, changing the appearance of an item etc.
    Skip unimportant events that are already evident from previous events.
    If an agent actively searches for hidden items, or your notes indicate that an action warrants it,
    you may choose an event to appropriately change a hidden item to a visible item.
    Do not reveal an item if the agent is simply looking around; they must signify their intent to try to find something hidden.
    Only autonomous agents should perform an emote.
    You may choose an event where an autonomous agent reacts by perform an emote, to indicate them doing something appropriate as an immediate consequence of the previous event. you must also include the agent_id of the agent performing the emote.
    If there are no relevant events, do not make any tool calls. Return an empty array.
    `;

}

// Given some natural language instructions, return a list of tool calls that can be made to execute the instructions
/*export async function interpetAgentInstructions(
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
        model: STRUCTURED_OUTPUT_MODEL, // "gpt-4o-2024-08-06",
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
*/
/*
export async function determineConsequentEventsInLocation(
    locationId: string,
    events: GameEvent[]
): Promise<AiToolCall[]> { //<ChatCompletionMessageToolCall[]> {
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
    const tools = getAvailableTools(null);
    const response: OpenAI.Chat.Completions.ChatCompletion = await openai.chat.completions.create({
        model: STRUCTURED_OUTPUT_MODEL,
        messages,
        tools,
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
*/

/*
export async function agentMakesInstructions(
    actingAgent: Agent
): Promise<string> {
    const recentEventsMessage = await describeRecentEvents(actingAgent.agentId);
    const systemPrompt = await agentMakesInstructionsSystemPrompt(actingAgent);
    const messages: ChatCompletionMessageParam[] = [
        { role: "system", content: SCENARIO_PROMPT },
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
        model: TEXT_OUTPUT_MODEL,
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
*/
