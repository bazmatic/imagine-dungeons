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
    //private locationService: LocationService;
    private exitService: ExitService;
    private itemService: ItemService;

    constructor() {
        this.openai = new OpenAI();
        this.agentService = new AgentService();
        this.commandService = new CommandService();
        //this.locationService = new LocationService();
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
        const agentsPresent = await location.agents;
        const agentsPresentDTO = await Promise.all(agentsPresent.map(agent =>
            agent.toDto()
        ));

        const context = {
            calling_agent_id: agentId,
            location: {
                location_id: locationDTO.id,
                name: locationDTO.name,
                description: locationDTO.shortDescription,
            },
            exits: locationDTO.exits.map((exit) => {
                return {
                    exit_id: exit.id,
                    description: exit.shortDescription,
                    direction: exit.direction,
                }
            }),
            items_present: itemsPresentDTO,
            agents_present: agentsPresentDTO.map((agent) => {
                return {
                    agent_id: agent.id,
                    name: agent.label,
                    description: agent.longDescription
                }
            }),
            inventory: inventoryDTO.map((item) => {
                return {
                    item_id: item.id,
                    name: item.label,
                    description: item.shortDescription
                }
            })
        };

        console.log(`===========================================`);
        console.log(`Context: ${JSON.stringify(context, null, 4)}`);
        console.log(`===========================================`);

        const content = {
            agent_command: inputText,
            context: `Here is the current context.
            It includes the calling agent, the location, the items present, the agents present, and the inventory of items owned by the calling agent.
            ${JSON.stringify(context, null, 4)}`
        };


        const openAiMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] =
            [{ role: "system", content: parserPrompt }];

        openAiMessages.push({ role: "user", content: JSON.stringify(content) });

        //console.debug(`Content: ${JSON.stringify(openAiMessages, null, 4)}`);

        const response: OpenAI.Chat.Completions.ChatCompletion =
            await this.openai.chat.completions.create({
                model: "gpt-3.5-turbo-1106",
                messages: openAiMessages,
                tools: OPEN_AI_TOOLS,
                seed: 100
            });
        const toolCalls = response.choices[0]?.message.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            console.debug(JSON.stringify(response, null, 4));
            throw new Error("No tool calls found");
        }
        console.log(`Tool calls: ${toolCalls.length}`);
        console.log(`Choices: ${ response.choices.length}`)

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
                case COMMAND_TYPE.EMOTE:
                    outputText = await agentActor.emote(toolCallArguments.emote_text);
                    break;
                    
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
                outputText.join("\n"),
                agentsPresent.map(agent => agent.agentId)
            );
            commands.push(command);
        }
        return commands;
    }

    public async describeCommandResult(
        observerAgentId: string,
        command: Command,
        hideDetails: boolean = false
        //firstPerson: boolean = true
    ): Promise<string[]> {

        const firstPerson = observerAgentId === command.agent_id;
        const result: string[] = [];
        const parameters = JSON.parse(command.command_arguments);
        const actor = await this.agentService.getAgentById(command.agent_id);

        if (!command.agents_present?.includes(observerAgentId)) {
            return [];
        }
        const observerText = firstPerson ? "You" : actor.label;
        switch (command.command_type) {
            case COMMAND_TYPE.EMOTE: {
                result.push(`${observerText}: ${command.output_text}`);
                break;
            }
            case COMMAND_TYPE.GO_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                result.push(
                    `${observerText} ${firstPerson ? "go" : "goes"} ${
                        exit.direction
                    }.`
                );
                if (command.output_text && firstPerson && !hideDetails) {
                    result.push(command.output_text);
                }
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
                if (command.output_text && !hideDetails) {
                    result.push(command.output_text);
                }
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
                if (command.output_text && !hideDetails) {
                    result.push(command.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AROUND: {

                result.push(
                    `${observerText} ${
                        firstPerson ? "look around" : "looks around"
                    }.`
                );
                if (command.output_text && !hideDetails) {
                    result.push(command.output_text);
                }
            }

            case COMMAND_TYPE.LOOK_AT_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                result.push(
                    `${observerText} ${
                        firstPerson ? "look at" : "looks at"
                    } the ${exit.direction}.`
                );
                if (command.output_text && !hideDetails) {
                    result.push(`${observerText} sees ${exit.direction}.`);
                }
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
                    } ${parameters.target_agent_id === command.agent_id ? "you" : targetAgent.label}.`
                );
                if (command.output_text && !hideDetails) {
                    result.push(`${observerText} says to ${parameters.target_agent_id === command.agent_id ? "you" : targetAgent.label}: "${command.output_text}"`);
                }
                break;
            }
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                result.push(`${observerText} ${
                    firstPerson ? "resolve" : "resolves"
                } to do something.`);
                break;

            default:
                throw new Error("Invalid command type");
        }

        return result;
    }
}

const parserPrompt = `You are an AI assistant designed to turn an agent's natural language instructions into a series of actions that can be taken in a game.
You are calling the function in the context of a specific agent represented by calling_agent_id.
You can call multiple functions at the same time, if the user's input seems to require it.
If the user's input does not clearly call for one of the functions below, then do not call any functions.
In most cases, you should include a call to the update_agent_intent function to update the agent's immediate intent.
For example, if someone has just spoken to you, you should call speak_to_agent to respond, and then update your intent.
If the agent's input starts with quotation marks, or doesn't seem to match any of the available tools, send the text verbatim to speak_to_agent to speak to an agent that is present in the same location.
`;


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
    LOOK_AROUND = "look_around",
    LOOK_AT_EXIT = "look_at_exit",
    SPEAK_TO_AGENT = "speak_to_agent",
    UPDATE_AGENT_INTENT = "update_agent_intent",
    EMOTE="emote"
}

export const AGENT_COMMANDS: Record<COMMAND_TYPE, AgentCommand> = {
    [COMMAND_TYPE.EMOTE]: {
        id: COMMAND_TYPE.EMOTE,
        openaiTool: {
            name: "emote",
            description: "Perform an emote or express a visible action or emotion",
            parameters: {
                type: "object",
                properties: {
                    emote_text: {
                        type: "string",
                        description: "A description of the character's action, expression, or emotional state that others can observe."
                    }
                },
                required: ["emote_text"],
                additionalProperties: false
            }
        }
    },
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
                        description: "The id of the exit to move through. This must match exit_id values listed in the exits array of the context."
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
                        description: "The id of the item to get, grab, collect or pick up. This must match item_id values listed in the items_present array of the context."
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
                        description: "The id of the item to drop. This must match item_id values listed in the inventory array of the context."
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
                        description: "The id of the item to look at. This must match item_id values listed in the items_present array or inventory array of the context."
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
                "Look at a game character present in the same location, eg 'look at Bob'.",
            parameters: {
                type: "object",
                properties: {
                    agent_id: {
                        type: "string",
                        description:
                            "The id of the agent (character) to look at. This must match agent_id values listed in the agents_present array of the context."
                    }
                },
                required: ["agent_id"],
                additionalProperties: false
            }
        }
    },
    [COMMAND_TYPE.LOOK_AROUND]: {
        id: COMMAND_TYPE.LOOK_AROUND,
        openaiTool: {
            name: "look_around",
            description: "Take a very detailed look around the current location.",
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
                        description: "The id of the exit to look at. This must match exit_id values listed in the exits array of the context."
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
                "Speak to an agent who is in the same location. You should call this if an agent has just spoken to you.\
                If the input text starts with 'talk to' or 'say' or 'ask' or 'tell', then they are indicating that this tool should be called.\
                Only return the spoken text, without any additional descriptive text.\
                Exclude quotation marks. Eg: Hello Bob, how are you?",
            parameters: {
                type: "object",
                properties: {
                    target_agent_id: {
                        type: "string",
                        description: "The id of the other agent to speak to. This must match agent_id values listed in the agents_present array of the context."
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
                "Update your short-term goals so you can remember what you are doing. Briefly describing what you are doing or planning to do next. This overrides any previous intent.",
            parameters: {
                type: "object",
                properties: {
                    intent: {
                        type: "string",
                        description: "Your new short-term goals. Briefly describing what you are doing or planning to do next."
                    }
                },
                required: ["intent"],
                additionalProperties: false
            }
        }
    }
};

export function getCommandTypeFromToolName(toolName: string): COMMAND_TYPE {
    console.log(`Tool name: ${toolName}`);
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
