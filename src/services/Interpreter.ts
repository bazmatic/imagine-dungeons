import { AgentActor } from "@/actor/agent.actor";
import { initialiseDatabase } from "..";
import OpenAI from "openai";
import { AgentService } from "./Agent.service";
import { CommandService } from "./Command.service";
import { Command } from "@/entity/Command";
import { LocationService } from "./Location.service";
import { ExitService } from "./Exit.service";
import { ItemService } from "./Item.service";
import { Agent } from "@/entity/Agent";
import { ChatCompletionTool, FunctionDefinition } from "openai/resources";

export class Interpreter {
    private openai: OpenAI;
    private agentService: AgentService;
    private commandService: CommandService;
    private locationService: LocationService;
    private exitService: ExitService;
    private itemService: ItemService;

    constructor() {
        this.openai = new OpenAI();
        this.agentService = new AgentService();
        this.commandService = new CommandService();
        this.locationService = new LocationService();
        this.exitService = new ExitService();
        this.itemService = new ItemService();
    }

    public async interpret(
        agentId: string,
        inputText: string
    ): Promise<Command[]> {
        await initialiseDatabase();
        const agentActor = new AgentActor(agentId);
        const agent = await this.agentService.getAgentById(agentId);
        const location = await agent.location;
        const locationDTO = await location.toDto();
        const inventory = await agent.items;
        const inventoryDTO = await Promise.all(
            inventory.map(item => item.toDto())
        );
        const itemsPresentDTO = await Promise.all((await location.items).map(item =>
            item.toDto()
        ));
        const agentsPresentDTO = await Promise.all((await location.agents).map(agent =>
            agent.toDto()
        ));

        const content = {
            agent_command: inputText,
            context: `Here is the current context.
            It includes the calling agent, the location, the items present, the agents present, and the inventory of items owned by the calling agent.
            ${JSON.stringify(
                {
                    calling_agent_id: agentId,
                    location: {
                        location_id: locationDTO.id,
                        name: locationDTO.name,
                        short_description: locationDTO.shortDescription,
                    },
                    exits: locationDTO.exits,
                    items_present: itemsPresentDTO,
                    agents_present: agentsPresentDTO,
                    inventory: inventoryDTO
                },
                null,
                4
            )}`
        };


        const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [{ role: "system", content: parserPrompt }];

        openAiMessages.push({ role: "user", content: JSON.stringify(content) });

        //console.debug(`Content: ${JSON.stringify(openAiMessages, null, 4)}`);

        const response: OpenAI.Chat.Completions.ChatCompletion =
            await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo-1106",
                messages: openAiMessages,
                tools: OPEN_AI_TOOLS
            });
        const toolCalls = response.choices[0]?.message.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            throw new Error("No tool calls found");
        }

        const rawResponse = response.choices[0]?.message;
        if (!rawResponse) {
            throw new Error("No response content found");
        }

        //console.log(`Raw response: ${JSON.stringify(rawResponse, null, 4)}`);

        const commands: Command[] = [];
        for (const toolCall of toolCalls) {
            const toolCallArguments = JSON.parse(toolCall.function.arguments);
            const commandType: COMMAND_TYPE = getCommandTypeFromToolName(
                toolCall.function.name
            );
            console.log(
                `Calling ${commandType} with arguments ${JSON.stringify(
                    toolCallArguments
                )}`
            );
            let outputText: string[] = [];

            switch (commandType) {
                case COMMAND_TYPE.GO_EXIT:
                    outputText = await agentActor.goExit(
                        toolCallArguments.exit_id
                    );

                    break;
                case COMMAND_TYPE.PICK_UP_ITEM:
                    outputText = await agentActor.pickUp(
                        toolCallArguments.item_id
                    );

                    break;
                case COMMAND_TYPE.DROP_ITEM:
                    outputText = await agentActor.dropItem(
                        toolCallArguments.item_id
                    );

                    break;
                case COMMAND_TYPE.LOOK_AT_ITEM:
                    outputText = await agentActor.lookAtItem(
                        toolCallArguments.item_id
                    );

                    break;
                case COMMAND_TYPE.LOOK_AT_AGENT:
                    outputText = await agentActor.lookAtAgent(
                        toolCallArguments.agent_id
                    );

                    break;
                case COMMAND_TYPE.LOOK_AT_LOCATION:
                    outputText = await agentActor.lookAtLocation(
                        toolCallArguments.location_id
                    );

                    break;
                case COMMAND_TYPE.LOOK_AROUND:
                    outputText = await agentActor.lookAround();

                    break;
                case COMMAND_TYPE.LOOK_AT_EXIT:
                    outputText = await agentActor.lookAtExit(
                        toolCallArguments.exit_id
                    );
                    break;
                case COMMAND_TYPE.SPEAK_TO_AGENT:
                    outputText = await agentActor.speakToAgent(
                        toolCallArguments.target_agent_id,
                        toolCallArguments.message
                    );
                    break;
                case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                    outputText = await agentActor.updateAgentIntent(
                        agentId,
                        toolCallArguments.intent
                    );

                    break;
                default:
                    throw new Error(`Invalid command type: ${commandType}`);
            }
            const command: Command = await this.commandService.makeAgentCommand(
                agentId,
                inputText,
                commandType,
                JSON.stringify(toolCallArguments),
                outputText.join("\n")
            );
            commands.push(command);
        }
        return commands;
    }

    public async describeCommandResult(
        observer: Agent,
        command: Command,
        hideDetails: boolean = false
        //firstPerson: boolean = true
    ): Promise<string[]> {
        const firstPerson = observer.agentId === command.agent_id;
        const result: string[] = [];
        const parameters = JSON.parse(command.command_arguments);
        const actor = await this.agentService.getAgentById(command.agent_id);
        const observerText = firstPerson ? "You" : actor.label;
        switch (command.command_type) {
            case COMMAND_TYPE.GO_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                result.push(
                    `${observerText} ${firstPerson ? "go" : "goes"} ${
                        exit.direction
                    }.`
                );
                break;
            }
            case COMMAND_TYPE.PICK_UP_ITEM: {
                const item = await this.itemService.getItemById(
                    parameters.item_id
                );
                result.push(
                    `${observerText} ${
                        firstPerson ? "pick up" : "picks up"
                    } the ${item.label}.`
                );
                break;
            }

            case COMMAND_TYPE.DROP_ITEM: {
                const item = await this.itemService.getItemById(
                    parameters.item_id
                );
                result.push(
                    `${observerText} ${firstPerson ? "drop" : "drops"} the ${
                        item.label
                    }.`
                );
                break;
            }

            case COMMAND_TYPE.LOOK_AT_ITEM: {
                const item = await this.itemService.getItemById(
                    parameters.item_id
                );
                result.push(
                    `${observerText} ${
                        firstPerson ? "look at" : "looks at"
                    } the ${item.label}.`
                );
                //esult.push(item.longDescription);
                break;
            }

            case COMMAND_TYPE.LOOK_AT_AGENT: {
                const agent = await this.agentService.getAgentById(
                    parameters.agent_id
                );
                result.push(
                    `${observerText} ${firstPerson ? "look at" : "looks at"} ${
                        agent.label
                    }.`
                );
                break;
            }

            case COMMAND_TYPE.LOOK_AT_LOCATION: {
                const location = await this.locationService.getLocationById(
                    parameters.location_id
                );
                result.push(
                    `${observerText} ${
                        firstPerson ? "look at" : "looks at"
                    } this place.`
                );
                //result.push(location.longDescription);
                break;
            }

            case COMMAND_TYPE.LOOK_AROUND: {
                const location = await this.locationService.getLocationById(
                    parameters.location_id
                );
                result.push(
                    `${observerText} ${
                        firstPerson ? "look around" : "looks around"
                    }.`
                );
            }

            case COMMAND_TYPE.LOOK_AT_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                result.push(
                    `${observerText} ${
                        firstPerson ? "look at" : "looks at"
                    } the ${exit.direction}.`
                );
                //result.push(exit.longDescription);
                break;
            }

            case COMMAND_TYPE.SPEAK_TO_AGENT: {
                const targetAgent = await this.agentService.getAgentById(
                    parameters.target_agent_id
                );
                result.push(
                    `${observerText} ${
                        firstPerson ? "speak to" : "speaks to"
                    } ${targetAgent.label}.`
                );
                //result.push(`"${parameters.message}"`);
                break;
            }
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                break;

            default:
                throw new Error("Invalid command type");
        }
        if (command.output_text && !hideDetails) {
            result.push(command.output_text);
        }
        return result;
    }
}

const parserPrompt = `You are an AI assistant designed to turn a user's natural language input into a series of actions that can be taken in a game.
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

export type AgentCommand = {
    id: string;
    openaiTool: FunctionDefinition;
};

export enum COMMAND_TYPE {
    GO_EXIT = "go_exit",
    PICK_UP_ITEM = "pick_up_item",
    DROP_ITEM = "drop_item",
    LOOK_AT_ITEM = "look_at_item",
    LOOK_AT_AGENT = "look_at_agent",
    LOOK_AT_LOCATION = "look_at_location",
    LOOK_AROUND = "look_around",
    LOOK_AT_EXIT = "look_at_exit",
    SPEAK_TO_AGENT = "speak_to_agent",
    UPDATE_AGENT_INTENT = "update_agent_intent"
}

export const AGENT_COMMANDS: Record<COMMAND_TYPE, AgentCommand> = {
    [COMMAND_TYPE.GO_EXIT]: {
        id: COMMAND_TYPE.GO_EXIT,
        openaiTool: {
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
    },
    [COMMAND_TYPE.PICK_UP_ITEM]: {
        id: COMMAND_TYPE.PICK_UP_ITEM,
        openaiTool: {
            name: "pick_up_item",
            description: "Get, grab, collect or pick up an item near you. ",
            parameters: {
                type: "object",
                properties: {
                    item_id: {
                        type: "string",
                        description: "The id of the item to get, grab, collect or pick up"
                    }
                },
                required: ["item_id"],
                additionalProperties: false
            }
        }
    },
    [COMMAND_TYPE.DROP_ITEM]: {
        id: COMMAND_TYPE.DROP_ITEM,
        openaiTool: {
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
    },
    [COMMAND_TYPE.LOOK_AT_ITEM]: {
        id: COMMAND_TYPE.LOOK_AT_ITEM,
        openaiTool: {
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
    },
    [COMMAND_TYPE.LOOK_AT_AGENT]: {
        id: COMMAND_TYPE.LOOK_AT_AGENT,
        openaiTool: {
            name: "look_at_agent",
            description:
                "Look at a game character present in the same location, eg 'look at Bob'",
            parameters: {
                type: "object",
                properties: {
                    agent_id: {
                        type: "string",
                        description:
                            "The id of the agent (character) to look at"
                    }
                },
                required: ["agent_id"],
                additionalProperties: false
            }
        }
    },
    [COMMAND_TYPE.LOOK_AT_LOCATION]: {
        id: COMMAND_TYPE.LOOK_AT_LOCATION,
        openaiTool: {
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
    },
    [COMMAND_TYPE.LOOK_AROUND]: {
        id: COMMAND_TYPE.LOOK_AROUND,
        openaiTool: {
            name: "look_around",
            description: "Look around the current location",
            parameters: {
                type: "object",
                properties: {
                    location_id: {
                        type: "string",
                        description: "The id of the location to look around"
                    }
                },
                required: ["location_id"],
                additionalProperties: false
            }
        }
    },
    [COMMAND_TYPE.LOOK_AT_EXIT]: {
        id: COMMAND_TYPE.LOOK_AT_EXIT,
        openaiTool: {
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
    },
    [COMMAND_TYPE.SPEAK_TO_AGENT]: {
        id: COMMAND_TYPE.SPEAK_TO_AGENT,
        openaiTool: {
            name: "speak_to_agent",
            description:
                "Speak to an agent who is in the same location. Only return the spoken text, without any additional descriptive text. Exclude quotation marks. Eg: Hello Bob, how are you?",
            parameters: {
                type: "object",
                properties: {
                    target_agent_id: {
                        type: "string",
                        description: "The id of the other agent to speak to"
                    },
                    message: {
                        type: "string",
                        description:
                            "The message to speak to the other agent, without any additional descriptive text. Exclude quotation marks."
                    }
                },
                required: ["target_agent_id", "message"],
                additionalProperties: false
            }
        }
    },
    [COMMAND_TYPE.UPDATE_AGENT_INTENT]: {
        id: COMMAND_TYPE.UPDATE_AGENT_INTENT,
        openaiTool: {
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
                required: ["intent"],
                additionalProperties: false
            }
        }
    }
};

export function getCommandTypeFromToolName(toolName: string): COMMAND_TYPE {
    return Object.values(AGENT_COMMANDS).find(c => c.id === toolName)
        ?.id as COMMAND_TYPE;
}

export function getToolNameFromCommandType(commandType: COMMAND_TYPE): string {
    return AGENT_COMMANDS[commandType].id;
}

export const OPEN_AI_TOOLS: ChatCompletionTool[] = Object.values(
    AGENT_COMMANDS
).map(c => {
    return {
        type: "function",
        function: { ...c.openaiTool }
    };
});
