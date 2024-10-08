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

export type PromptContext = {
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

    private async getContext(agentId: string): Promise<PromptContext> {
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
    ): Promise<Command[]> {
        await initialiseDatabase();
        const agentActor = new AgentActor(agentId);
        const agent: Agent = await agentActor.agent();
        const context: PromptContext = await this.getContext(agentId);

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
                model: "gpt-4o-2024-08-06",
                messages: openAiMessages,
                tools: getOpenAiTools(agent, context),
                tool_choice: "required",
                //seed: 101,  

            });
        const toolCalls = response.choices[0]?.message.tool_calls;
        if (!toolCalls || toolCalls.length === 0) {
            console.debug(JSON.stringify(response, null, 4));
            throw new Error("No tool calls found");
        }
        console.log(`Tool calls: ${toolCalls.length}`);
        console.log(`Choices: ${response.choices.length}`);

        const rawResponse = response.choices[0]?.message;
        if (!rawResponse) {
            throw new Error("No response content found");
        }

        //console.log(`Raw response: ${JSON.stringify(rawResponse, null, 4)}`);

        const commands: Command[] = [];
        for (const toolCall of toolCalls) {
            if (toolCall.function.name === "multi_tool_use.parallel") {
                console.warn("multi_tool_use.parallel is not supported");
                continue;
            }
            const toolCallArguments = JSON.parse(toolCall.function.arguments);
            const commandType: COMMAND_TYPE = toolCall.function
                .name as COMMAND_TYPE;

            console.log(
                `Calling ${commandType} with arguments ${JSON.stringify(
                    toolCallArguments
                )}`
            );
            let outputText: string[] = [];

            switch (commandType) {
                case COMMAND_TYPE.EMOTE:
                    outputText = await agentActor.emote(
                        toolCallArguments.emote_text
                    );
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
                case COMMAND_TYPE.WAIT:
                    outputText = await agentActor.wait();
                    break;
                case COMMAND_TYPE.GIVE_ITEM_TO_AGENT:
                    outputText = await agentActor.giveItemToAgent(
                        toolCallArguments.item_id,
                        toolCallArguments.target_agent_id
                    );
                    break;
                case COMMAND_TYPE.GET_INVENTORY:
                    outputText = await agentActor.getInventory();
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
                context
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
                result.push(`${command.output_text}`);
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
                break;
            }

            case COMMAND_TYPE.LOOK_AT_EXIT: {
                const exit = await this.exitService.getById(parameters.exit_id);
                result.push(
                    `${observerText} ${
                        firstPerson ? "look at" : "looks at"
                    } the ${exit.direction}.`
                );
                if (command.output_text && !hideDetails) {
                    result.push(`${command.output_text}`);
                }
                break;
            }

            case COMMAND_TYPE.SPEAK_TO_AGENT: {
                const targetAgent = await this.agentService.getAgentById(
                    parameters.target_agent_id
                );

                result.push(
                    `${observerText} ${
                        firstPerson ? "speak to" : "speaks to"
                    } ${
                        parameters.target_agent_id === command.agent_id
                            ? "you"
                            : targetAgent.label
                    }.`
                );
                if (command.output_text && !hideDetails) {
                    result.push(
                        `${observerText} ${firstPerson ? "say" : "says"}: "${
                            command.output_text
                        }"`
                    );
                }
                break;
            }
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                result.push(
                    `${observerText} ${
                        firstPerson ? "resolve" : "resolves"
                    } to do something.`
                );
                if (command.output_text && firstPerson) {
                    result.push(command.output_text);
                }
                break;

            case COMMAND_TYPE.WAIT:
                result.push(
                    `${observerText} ${firstPerson ? "wait" : "waits"}.`
                );
                break;

            case COMMAND_TYPE.GIVE_ITEM_TO_AGENT: {
                try {
                    const item = await this.itemService.getItemById(
                        parameters.item_id
                    );
                    const targetAgent = await this.agentService.getAgentById(
                        parameters.target_agent_id
                    );
                    result.push(
                        `${observerText} ${
                            firstPerson ? "give" : "gives"
                        } the ${item.label} to ${targetAgent.label}.`
                    );
                } catch (error) {
                    console.error(error);
                    result.push(
                        `${observerText} ${
                            firstPerson ? "try to give" : "tries to give"
                        } something to someone, but it doesn't seem to work.`
                    );
                }
                break;
            }

            case COMMAND_TYPE.GET_INVENTORY: {
                if (firstPerson && command.output_text) {
                    result.push(command.output_text);
                } else {
                    result.push(`${observerText} checks their inventory.`);
                }
                break;
            }

            default:
                throw new Error(
                    `Invalid command type: ${command.command_type}`
                );
        }

        return result;
    }
}

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
Updating intent does not change the game state, it just informs the agent's short term goals.
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
    EMOTE = "emote",
    WAIT = "wait",
    GIVE_ITEM_TO_AGENT = "give_item_to_agent",
    GET_INVENTORY = "get_inventory"
}

export function getAgentCommands(
    agent: Agent,
    context: PromptContext
): AgentCommand[] {
    const commonCommands = [
        {
            id: COMMAND_TYPE.EMOTE,
            openaiTool: {
                name: "emote",
                description:
                    "Perform an action that has no direct effect, or express a visible action or emotion. Do not include any speech. Do not do anything that is covered by other commands. Describe the action from a third-person perspective.",
                parameters: {
                    type: "object",
                    properties: {
                        emote_text: {
                            type: "string",
                            description:
                                "A description of the character's expression, or emotional state that others can observe."
                        }
                    },
                    required: ["emote_text"],
                    additionalProperties: false
                }
            }
        },
        {
            id: COMMAND_TYPE.GO_EXIT,
            openaiTool: {
                name: "go_exit",
                description: "Move the agent through the specified exit. This will change the agent's location.",
                parameters: {
                    type: "object",
                    properties: {
                        exit_id: {
                            type: "string",
                            description:
                                "The id of the exit to move through. This must match exit_id values listed in the exits array of the context."
                        }
                    },
                    required: ["exit_id"],
                    additionalProperties: false
                }
            }
        },
        {
            id: COMMAND_TYPE.PICK_UP_ITEM,
            openaiTool: {
                name: "pick_up_item",
                description: "Get, grab, collect or pick up an item near you. ",
                parameters: {
                    type: "object",
                    properties: {
                        item_id: {
                            type: "string",
                            description:
                                "The id of the item to get, grab, collect or pick up. This must match item_id values listed in the items_present array of the context."
                        }
                    },
                    required: ["item_id"],
                    additionalProperties: false
                }
            }
        },
        {
            id: COMMAND_TYPE.DROP_ITEM,
            openaiTool: {
                name: "drop_item",
                description: "Drop an item",
                parameters: {
                    type: "object",
                    properties: {
                        item_id: {
                            type: "string",
                            description:
                                "The id of the item to drop. This must match item_id values listed in the inventory array of the context."
                        }
                    },
                    required: ["item_id"],
                    additionalProperties: false
                }
            }
        },
        {
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
                            description:
                                "The id of the other agent to speak to. This must match agent_id values listed in the agents_present array of the context."
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
        {
            id: COMMAND_TYPE.WAIT,
            openaiTool: {
                name: "wait",
                description: "Do nothing for this turn",
            }
        },
        {
            id: COMMAND_TYPE.GIVE_ITEM_TO_AGENT,
            openaiTool: {
                name: "give_item_to_agent",
                description:
                    "Give an item from your inventory to another agent in the same location. If your agent wants an item from another agent, do not call this tool. Instead, call the 'speak_to_agent' tool to ask the other agent if they have the item and want to give it.",
                parameters: {
                    type: "object",
                    properties: {
                        item_id: {
                            type: "string",
                            description:
                                "The id of the item to give. This must match item_id values listed in the inventory array of the context."
                        },
                        target_agent_id: {
                            type: "string",
                            description:
                                "The id of the agent to give the item to. This must match agent_id values listed in the agents_present array of the context."
                        }
                    },
                    required: ["item_id", "target_agent_id"],
                    additionalProperties: false
                }
            }
        }
    ];

    const autonomousCommands = [
        {
            id: COMMAND_TYPE.UPDATE_AGENT_INTENT,
            openaiTool: {
                name: "update_agent_intent",
                description:
                    "Update your short-term goals so you can remember what you are doing. Briefly describing what you are doing or planning to do next. This overrides any previous intent. This does not change your location. The game state does not change when you update your intent. Your intent should begin with 'I intend to...'",
                parameters: { 
                    type: "object",
                    properties: {
                        intent: {
                            type: "string",
                            description:
                                "Your new short-term goals. Briefly describing what you are doing or planning to do next."
                        }
                    },
                    required: ["intent"],
                    additionalProperties: false
                }
            }
        }
    ];

    

    if (!agent.autonomous) {
        // Add additional commands for non-autonomous agents
        return [
            ...commonCommands,
            {
                id: COMMAND_TYPE.LOOK_AT_ITEM,
                openaiTool: {
                    name: "look_at_item",
                    description: "Look at an item. If (and only if) the text suggests that the primary action is to look at an item, then call this tool. Otherwise, do not call this tool.",
                    parameters: {
                        type: "object",
                        properties: {
                            item_id: {
                                type: "string",
                                description:
                                    "The id of the item to look at. This must match item_id values listed in the items_present array or inventory array of the context."
                            }
                        },
                        required: ["item_id"],
                        additionalProperties: false
                    }
                }
            },
            {
                id: COMMAND_TYPE.LOOK_AT_AGENT,
                openaiTool: {
                    name: "look_at_agent",
                    description:
                        "Look at a game character present in the same location, eg 'look at Bob'. If (and only if) the text suggests that the primary action is to look at a character, then call this tool. Otherwise, do not call this tool.",
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
            {
                id: COMMAND_TYPE.LOOK_AROUND,
                openaiTool: {
                    name: "look_around",
                    description:
                        "Take a very detailed look around the current location."
                }
            },
            {
                id: COMMAND_TYPE.LOOK_AT_EXIT,
                openaiTool: {
                    name: "look_at_exit",
                    description: "Look at an exit",
                    parameters: {
                        type: "object",
                        properties: {
                            exit_id: {
                                type: "string",
                                description:
                                    "The id of the exit to look at. This must match exit_id values listed in the exits array of the context."
                            }
                        },
                        required: ["exit_id"],
                        additionalProperties: false
                    }
                }
            },
            {
                id: COMMAND_TYPE.GET_INVENTORY,
                openaiTool: {
                    name: "get_inventory",
                    description: "Get a list of items in your inventory",
                    parameters: {
                        type: "object",
                        properties: {},
                        additionalProperties: false
                    }
                }
            }
        ];
    }
    else {
        return [
            ...commonCommands,
            ...autonomousCommands
        ];
    }
}

export function getOpenAiTools(
    agent: Agent,
    context: PromptContext
): ChatCompletionTool[] {
    const agentCommands = getAgentCommands(agent, context);
    return agentCommands.map(c => {
        return {
            type: "function",
            function: { ...c.openaiTool }
        };
    });
}