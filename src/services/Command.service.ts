// Given a string, decide which action to take.
// Call the appropriate service method

import OpenAI from "openai";
import dotenv from "dotenv";
import { AgentActor } from "@/actor/agent.actor";
import { AgentService } from "./Agent.service";
import { initialiseDatabase } from "..";
import { Repository } from "typeorm";
import { AppDataSource } from "@/data-source";
import { Command } from "@/entity/Command";
dotenv.config();

export class CommandService {
    private openai: OpenAI;
    private agentService: AgentService;
    private commandRepository: Repository<Command>;

    constructor() {
        this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        this.agentService = new AgentService();
        this.commandRepository = AppDataSource.getRepository(Command);
    }

    public async saveAgentCommand(
        agentId: string,
        inputText: string | undefined,
        responseText: string,
        rawResponse: OpenAI.Chat.Completions.ChatCompletionMessage | undefined
    ): Promise<void> {
        const command = new Command();
        command.agent_id = agentId;
        command.input_text = inputText;
        command.response_text = responseText;
        command.raw_response = rawResponse
            ? JSON.stringify(rawResponse)
            : undefined;
        await this.commandRepository.save(command);
    }

    public async getRecentCommands(
        agentId: string,
        count: number
    ): Promise<Command[]> {
        return this.commandRepository.find({
            where: { agent_id: agentId },
            order: { created_at: "DESC" },
            take: count
        });
    }

    public async issueCommand(
        agentId: string,
        input: string
    ): Promise<string[]> {
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
            UPDATE_AGENT_INTENT
        ];

        const agent = await this.agentService.getAgentById(agentId);
        const location = await agent.location;
        const locationDTO = await location.toDto();
        const inventory = await agent.items;
        const inventoryDTO = await Promise.all(
            inventory.map(item => item.toDto())
        );
        const itemsPresentDTO = (await location.items).map(item => item.toDto());
        const agentsPresentDTO = (await location.agents).map(agent => agent.toDto());

        const content = {
            user_command: input,
            context: `Here is the current context.
            It includes the calling agent, the location, the items present, the agents present, and the inventory of items owned by the calling agent.
            ${JSON.stringify(
            {
                calling_agent_id: agentId,
                location: location,
                items_present: itemsPresentDTO,
                agents_present: agentsPresentDTO,
                inventory: inventoryDTO
            }, null, 4)}`
        };

        const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [{ role: "system", content: parserPrompt }];

        openAiMessages.push({ role: "user", content: JSON.stringify(content) });

        const response: OpenAI.Chat.Completions.ChatCompletion =
            await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo-1106",
                messages: openAiMessages,
                tools: tools,
            });
        const toolCalls = response.choices[0]?.message.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            throw new Error("No tool calls found");
        }

        const rawResponse = response.choices[0]?.message;
        if (!rawResponse) {
            throw new Error("No response content found");
        }

        console.log(`Raw response: ${JSON.stringify(rawResponse, null, 4)}`);
        let responseMessage: string[] = [];
        for (const toolCall of toolCalls) {
            const toolCallArguments = JSON.parse(toolCall.function.arguments);
            const toolName = toolCall.function.name;
            
            console.log(
                `Calling ${toolName} with arguments ${JSON.stringify(
                    toolCallArguments
                )}`
            );
            switch (toolName) {
                case GO_EXIT.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.goExit(toolCallArguments.exit_id)
                    );
                    break;
                case PICK_UP_ITEM.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.pickUp(toolCallArguments.item_id)
                    );
                    break;
                case DROP_ITEM.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.dropItem(toolCallArguments.item_id)
                    );
                    break;
                case LOOK_AT_ITEM.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.lookAtItem(toolCallArguments.item_id)
                    );
                    break;
                case LOOK_AT_AGENT.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.lookAtAgent(toolCallArguments.agent_id)
                    );
                    break;
                case LOOK_AT_LOCATION.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.lookAtLocation(
                            toolCallArguments.location_id
                        )
                    );
                    break;
                case LOOK_AROUND.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.lookAround()
                    );
                    break;
                case LOOK_AT_EXIT.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.lookAtExit(toolCallArguments.exit_id)
                    );
                    break;
                case SPEAK_TO_AGENT.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.speakToAgent(
                            toolCallArguments.target_agent_id,
                            toolCallArguments.message
                        )
                    );
                    break;
                case UPDATE_AGENT_INTENT.function.name:
                    responseMessage = responseMessage.concat(
                        await agentActor.updateAgentIntent(
                            agentId,
                            toolCallArguments.intent
                        )
                    );
                    break;
                default:
                    throw new Error("Invalid tool name");
            }

            await this.saveAgentCommand(
                agentId,
                input,
                responseMessage.map(msg => `${msg}\n`).join(""),
                rawResponse
            );
        }
        return responseMessage;
    }
}

const parserPrompt = `You are an AI assistant designed to turn a user's natural language input into an action that can be taken in a game.
You are calling the function in the context of a specific agent represented by calling_agent_id.
You can call multiple functions at the same time, if the user's input seems to require it.
If the user's input does not clearly call for one of the functions below, then do not call any functions.
In most cases, you should finish by calling the update_agent_intent function to update the agent's immediate intent.
For example, if someone has just spoken to you, you should call speak_to_agent to respond, and then update your intent.
`;

const UPDATE_AGENT_INTENT: OpenAI.Chat.Completions.ChatCompletionTool = {
    type: "function",
    function: {
        name: "update_agent_intent",
        description:
            "Update the immediate intent of the calling agent, briefly describing what the agent is doing or planning to do next. This overrides any previous intent.",
        parameters: {
            type: "object",
            properties: {
                intent: {
                    type: "string",
                    description: "The new intent of the agent"
                }
            },
            required: ["agent_id", "intent"],
            additionalProperties: false
        }
    }
};

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
        description: "Pick up an item near you",
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
        description: "Look at a game character present in the same location, eg 'look at Bob'",
        parameters: {
            type: "object",
            properties: {
                agent_id: {
                    type: "string",
                    description: "The id of the agent (character) to look at"
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
        description:
            "Speak to an agent who is in the same location. Only pass the spoken text, without any additional descriptive text. Exclude quotation marks.",
        parameters: {
            type: "object",
            properties: {
                target_agent_id: {
                    type: "string",
                    description: "The id of the other agent to speak to"
                },
                message: {
                    type: "string",
                    description: "The message to speak to the other agent"
                }
            },
            required: ["agent_id", "message"],
            additionalProperties: false
        }
    }
};
