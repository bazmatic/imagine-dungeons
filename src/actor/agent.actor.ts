import dotenv from "dotenv";
import { Agent } from "@/entity/Agent";
import { AgentService } from "@/services/Agent.service";
import { OpenAI } from "openai";
import { Location } from "@/entity/Location";
import { Item } from "@/entity/Item";
import { GameEventService } from "@/services/GameEventService";
import { Referee } from "@/services/Referee";
import { GameEvent } from "@/entity/GameEvent";
import { EventDescription } from "@/types/types";

dotenv.config();

/*
This represents an autonomous agent (NPC) in the game.
The `act` method decides what to do and then the instructions are sent to the referee to be executed.
*/

export class AgentActor {
    private agentService: AgentService;
    private gameEventService: GameEventService;
    private referee: Referee;
    private openai: OpenAI;

    constructor(public agentId: string) {
        this.agentService = new AgentService();
        this.gameEventService = new GameEventService();
        this.referee = new Referee();
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }

    public async agent(): Promise<Agent> {
        return this.agentService.getAgentById(this.agentId);
    }

    // Decide what to do and do it. Return the commands that were issued.
    public async act(): Promise<GameEvent[]> {
        //=== Get the context
        const agent: Agent = await this.agent();
        if (agent.health <= 0) {
            return [];
        }
        // Location and inventory
        const location: Location = await agent.location;
        const inventory: Item[] = await agent.items;
        const itemsPresent: Item[] = await location.items;
        const agentsPresent: Agent[] = await location.agents;

        // OpenAI messages
        const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam =
            {
                role: "system",
                content: `You are acting as ${agent.label}, ${
                    agent.longDescription
                }. You are actually an autonomous agent in a game but you won't reveal that.
            Your location: ${location.shortDescription}
            Items present: ${itemsPresent.map(item => item.label).join(", ")}
            Characters present: ${agentsPresent
                .filter(a => a.agentId !== agent.agentId)
                .map(a => a.label)
                .join(", ")}
            Your inventory: ${inventory.map(item => item.label).join(", ")}
            Your emotional state: You are feeling ${agent.mood}
            Your current intent: ${agent.currentIntent}
            Your long-term goal: ${agent.goal}
            Your backstory: ${agent.backstory}`
            };
        const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            systemMessage
        ];
        // Previous commands and response
        const previousGameEvents = await this.gameEventService.getRecentGameEvents(
            this.agentId,
            20
        );
        // Filter commands

        // Now make historical messages
        const recentEvents = await this.gameEventService.getRecentGameEvents(agent.agentId, 10);
        const recentEventDescriptions: EventDescription[] = (
            await Promise.all(
                recentEvents.map(gameEvent => gameEvent.describe(agent))
            )
        ).filter(e => e !== null) as EventDescription[];
        const recentEventsPrompt = `The following events occurred in this round in this location:\n${recentEventDescriptions
            .map(e => `${e.general_description}: ${e.extra_detail?.join("\n")}`)
            .join("\n\n")}`;
    


        // for (const ge of previousGameEvents) {
        //     if (ge.agent_id === this.agentId && ge.input_text) {
        //         const eventDescription = await ge.describe(
        //             agent
        //         );
        //         messages.push({
        //             role: "assistant",
        //             content: eventDescription?.general_description ?? "No general description"
        //         });
        //     }
        //     messages.push({
        //         role: "user",
        //         content: ge.input_text ?? "No input text"
        //     });
        // } // Added closing brace for the for loop

        messages.push({ role: "system", content: recentEventsPrompt });

        // Ask the agent what to do
        messages.push({
            role: "user",
            content: `What do you want to do? Type your instructions and I'll tell you what happens next. Avoid doing the same thing twice in a row. Try something different.`
        });

        // Get the instructions from the agent
        const response = await this.openai.chat.completions.create({
            model: "gpt-4o-2024-08-06",
            messages,
            seed: 100,
        });

        const choices = response.choices;
        if (!choices || choices.length === 0) {
            throw new Error("No choices from OpenAI");
        }

        const inputText = choices[0].message.content;
        if (!inputText) {
            throw new Error("No command found");
        }

        // Issue the command to the interpreter just as if it were a player
        const gameEvents: GameEvent[] = await this.referee.acceptAgentInstructions(
            this.agentId,
            inputText
        );

        return gameEvents;
    }
}
