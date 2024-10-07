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
import { Repository } from "typeorm";
import { AppDataSource } from "@/data-source";
import { Command } from "@/entity/Command";
dotenv.config();

export class CommandService {
    private openai: OpenAI;
    private agentService: AgentService;
    private locationService: LocationService;
    private exitService: ExitService;
    private itemService: ItemService
    private commandRepository: Repository<Command>;

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.agentService = new AgentService();
        this.locationService = new LocationService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
        this.commandRepository = AppDataSource.getRepository(Command);
    }

    public async saveAgentCommand(agentId: string, commandText: string, response: OpenAI.Chat.Completions.ChatCompletion): Promise<void> {
        const command = new Command();
        command.agent_id = agentId;
        command.raw_text = commandText;
        command.response = JSON.stringify(response);
        await this.commandRepository.save(command);
    }

    public async getRecentCommands(agentId: string, count: number): Promise<Command[]> {
        return this.commandRepository.find({
            where: { agent_id: agentId },
            order: { created_at: "DESC" },
            take: count
        });
    }

    public async obey(agentId: string, input: string): Promise<string[]> {
        await initialiseDatabase();
        const agentActor = new AgentActor(agentId);

        const tools = [
            GO_EXIT,
            PICK_UP_ITEM,
            DROP_ITEM,
            LOOK_AT_ITEM,
            LOOK_AT_AGENT,
            LOOK_AROUND,
            LOOK_AT_EXIT,
            SPEAK_TO_AGENT,
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

        // const recentCommands = await this.getRecentCommands(agentId, 2);
        const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
            { role: "system", content: parserPrompt },
        ];
        // recentCommands.forEach(c => {
        //     openAiMessages.push({ role: "user", content: c.raw_text });
        //     openAiMessages.push({ role: "assistant", content: c.response });
        // });

        openAiMessages.push({ role: "user", content: JSON.stringify(content) });

        const response: OpenAI.Chat.Completions.ChatCompletion = await this.openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: openAiMessages,
            tools: tools
        });
        if (!response.choices[0]?.message.tool_calls) {
            throw new Error("No tool calls found");
        }
        await this.saveAgentCommand(agentId, input, response);
       
        const toolCall = response.choices[0]?.message.tool_calls[0];
        const toolCallArguments = JSON.parse(toolCall.function.arguments);
        const toolName = toolCall.function.name;
        let responseMessage: string[] = [];
        console.log(`Calling ${toolName} with arguments ${toolCallArguments}`);
        switch (toolName) {
            case GO_EXIT.function.name:
                responseMessage = responseMessage.concat(await agentActor.goExit(toolCallArguments.exit_id));
                break;
            case PICK_UP_ITEM.function.name:
                responseMessage = responseMessage.concat(await agentActor.pickUp(toolCallArguments.item_id));
                break;
            case DROP_ITEM.function.name:
                responseMessage = responseMessage.concat(await agentActor.dropItem(toolCallArguments.item_id));
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
            case SPEAK_TO_AGENT.function.name:
                responseMessage = responseMessage.concat(await agentActor.speakToAgent(toolCallArguments.agent_id, toolCallArguments.message));
                break;
            default:
                throw new Error("Invalid tool name");
        }
        return responseMessage;
    }
}

const parserPrompt = `
You are an AI assistant designed to turn a user's natural language input into an action that can be taken in a game. 
`;

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

const SPEAK_TO_AGENT: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "speak_to_agent",
        description: "Speak to an agent",
        parameters: {
            type: "object",
            properties: {
                agent_id: {
                    type: "string",
                    description: "The id of the agent to speak to"
                },
                message: {
                    type: "string",
                    description: "The message to speak to the agent"
                }
            },
            required: ["agent_id", "message"],
            additionalProperties: false
        }
    }
};
