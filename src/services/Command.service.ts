// Given a string, decide which action to take.
// Call the appropriate service method

import OpenAI from "openai";
import dotenv from "dotenv";
import { AgentActor } from "@/actor/agent.actor";
import { LocationService } from "./Location.service";
import { ItemService } from "./Item.service";
import { ExitService } from "./Exit.service";
import { AgentService } from "./Agent.service";
import { initialiseDatabase } from "..";
dotenv.config();

export class CommandService {
    private openai: OpenAI;
    private agentService: AgentService;
    private locationService: LocationService;
    private exitService: ExitService;
    private itemService: ItemService

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.agentService = new AgentService();
        this.locationService = new LocationService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
    }

    public async parse(agentId: string, input: string): Promise<string[]> {
        await initialiseDatabase();
        const agentActor = new AgentActor(agentId);

        const tools = [
            GO_EXIT,
            PICK_UP_ITEM,
            DROP_ITEM,
            LOOK_AT_ITEM,
            LOOK_AT_AGENT,
            LOOK_AT_LOCATION,
            LOOK_AROUND,
            LOOK_AT_EXIT
        ];

        const agent = await this.agentService.getAgentById(agentId);
        const location = await agent.location;
        const locationDTO = await location.toDto();
        const inventory = await agent.items;
        const inventoryDTO = await Promise.all(inventory.map(item => item.toDto()));

        const content = {
            user_command: input,
            context: {
                location: locationDTO,
                inventory: inventoryDTO
            }
        }
        const response: OpenAI.Chat.Completions.ChatCompletion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: parserPrompt },
                { role: "user", content: JSON.stringify(content) }
            ],
            tools: tools
        });
        if (!response.choices[0]?.message.tool_calls) {
            throw new Error("No tool calls found");
        }
        const toolCall = response.choices[0]?.message.tool_calls[0];
        const toolCallArguments = JSON.parse(toolCall.function.arguments);
        const toolName = toolCall.function.name;
        let responseMessage: string[] = [];
        console.log(`Calling ${toolName} with arguments ${toolCallArguments}`);
        switch (toolName) {
            case GO_EXIT.function.name:
                await agentActor.goExit(toolCallArguments.exit_id);
                responseMessage.push("OK");
                break;
            case PICK_UP_ITEM.function.name:
                await agentActor.pickUp(toolCallArguments.item_id);
                responseMessage.push("OK");
                break;
            case DROP_ITEM.function.name:
                await agentActor.dropItem(toolCallArguments.item_id);
                responseMessage.push("OK");
                break;
            case LOOK_AT_ITEM.function.name:
                responseMessage = responseMessage.concat(await agentActor.lookAtItem(toolCallArguments.item_id));
                break;
            case LOOK_AT_AGENT.function.name:
                responseMessage = responseMessage.concat(await agentActor.lookAtAgent(toolCallArguments.agent_id));
                break;
            case LOOK_AT_LOCATION.function.name:
                responseMessage = responseMessage.concat(await agentActor.lookAtLocation(toolCallArguments.location_id));
                break;
            case LOOK_AROUND.function.name:
                responseMessage = responseMessage.concat(await agentActor.lookAround());
                break;
            case LOOK_AT_EXIT.function.name:
                responseMessage = responseMessage.concat(await agentActor.lookAtExit(toolCallArguments.exit_id));
                break;
            default:
                throw new Error("Invalid tool name");
        }
        console.log(responseMessage);
        return responseMessage;
    }
}

const parserPrompt = `
You are an AI assistant designed to turn a user's natural language input into an action that can be taken in a game. 
`;

// const parserResponseSchema = z.object({
//     action: z.string(),
//     target: z.string(),
// });

const GO_EXIT: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "go_exit",
        description: "Move the agent through the specified exit",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string",
                    description: "The id of the exit to move through"
                }
            },
            required: ["exit_id"],
            additionalProperties: false
        }
    }
};
const PICK_UP_ITEM: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "pick_up_item",
        description: "Pick up an item",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to pick up"
                }
            },
            required: ["item_id"],
            additionalProperties: false
        }
    }
};
const DROP_ITEM: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "drop_item",
        description: "Drop an item",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to drop"
                }
            },
            required: ["item_id"],
            additionalProperties: false
        }
    }
};
const LOOK_AT_ITEM: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "look_at_item",
        description: "Look at an item",
        parameters: {
            type: "object",
            properties: {
                item_id: {
                    type: "string",
                    description: "The id of the item to look at"
                }
            },
            required: ["item_id"],
            additionalProperties: false
        }
    }
};
const LOOK_AT_AGENT: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "look_at_agent",
        description: "Look at an agent",
        parameters: {
            type: "object",
            properties: {
                agent_id: {
                    type: "string",
                    description: "The id of the agent to look at"
                }
            },
            required: ["agent_id"],
            additionalProperties: false
        }
    }
};
const LOOK_AT_LOCATION: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "look_at_location",
        description: "Look at the current location",
        parameters: {
            type: "object",
            properties: {
                location_id: {
                    type: "string",
                    description: "The id of the location to look at"
                }
            },
            required: ["location_id"],
            additionalProperties: false
        }
    }
};
const LOOK_AROUND: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "look_around",
        description: "Look around the current location"
    }
};
const LOOK_AT_EXIT: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "look_at_exit",
        description: "Look at an exit",
        parameters: {
            type: "object",
            properties: {
                exit_id: {
                    type: "string",
                    description: "The id of the exit to look at"
                }
            },
            required: ["exit_id"],
            additionalProperties: false
        }
    }
};
