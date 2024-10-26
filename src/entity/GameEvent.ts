// TypeORM

import { AgentService } from "@/services/Agent.service";
import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn
} from "typeorm";

import { Agent } from "./Agent";
import { ItemService } from "@/services/Item.service";
import { ExitService } from "@/services/Exit.service";
import { LocationService } from "@/services/Location.service";
import { EventDescription } from "@/types/types";
import { COMMAND_TYPE } from "@/types/commands";
import { CreatureTemplateService } from "@/services/CreatureTemplate.service";

@Entity()
export class GameEvent {
    @PrimaryGeneratedColumn()
    game_event_id: number;

    @Column()
    agent_id?: string;

    @Column()
    location_id?: string;

    @Column()
    input_text?: string;

    @Column({ type: "text" })
    command_type: COMMAND_TYPE;

    @Column({ type: "jsonb" })
    command_arguments: string;

    get arguments(): Record<string, unknown> {
        return JSON.parse(this.command_arguments);
    }

    @Column()
    output_text?: string;

    @Column({ type: "jsonb" })
    agents_present?: string[];

    @CreateDateColumn()
    created_at: Date;

    public async describe(
        observerAgent: Agent | null
    ): Promise<EventDescription | null> {
        const exitService = new ExitService();
        const itemService = new ItemService();
        const agentService = new AgentService();
        const locationService = new LocationService();
        const isFirstPerson = observerAgent?.agentId === this.agent_id; // You are observing your own event

        // If the observer wasn't present at the event, don't describe it
        const isObserverPresent = observerAgent ? this.agents_present?.includes(observerAgent.agentId) : true;
        if (
            observerAgent?.agentId &&
            !isFirstPerson &&
            !isObserverPresent
        ) {
            return null;
        }
        
        let actorName = "The Universe";
        if (this.agent_id) {
            const actorAgent = await agentService.getAgentById(this.agent_id);
            actorName = isFirstPerson
                ? "You"
            : actorAgent?.label ?? "The Universe";
        } 
        const parameters = JSON.parse(this.command_arguments);

        let generalDescription: string = "";
        const extraDetail: string[] = [];

        // If you are the person you're observing or you are the system, show extra detail for events that have private details
        const showPrivateDetail =
            isFirstPerson || observerAgent?.agentId === null;

        switch (this.command_type) {
            case COMMAND_TYPE.EMOTE: {
                // No general description for emotes, just the output text. There's no need to say "You emote"
                generalDescription = `${this.output_text}`;
                break;
            }
            case COMMAND_TYPE.EVENT: {
                generalDescription = `${this.output_text}`;
                break;
            }
            case COMMAND_TYPE.GO_EXIT: {
                // <Agent> goes <direction>
                const exit = await exitService.getById(parameters.exit_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "go" : "goes"
                } ${exit.direction}.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.PICK_UP_ITEM: {
                // Only general description for picking up an item
                // <Agent> picks up <Item>
                const item = await itemService.getItemById(parameters.item_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "pick up" : "picks up"
                } the ${item.label}.`;
                break;
            }

            case COMMAND_TYPE.DROP_ITEM: {
                // Only general description for dropping an item
                // <Agent> drops <Item>
                const item = await itemService.getItemById(parameters.item_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "drop" : "drops"
                } the ${item.label}.`;
                break;
            }

            case COMMAND_TYPE.LOOK_AT_ITEM: {
                // Usually a general description for looking at an item
                // However some special items such as a book or magical items might have extra detail, egYou can see that there is a monster north of you"
                // <Agent> looks at <Item
                const item = await itemService.getItemById(parameters.item_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "look at" : "looks at"
                } the ${item.label}.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AT_AGENT: {
                // A general description and then the description of the agent
                // <Agent> looks at <Agent>
                // <Description of agent>
                const agent = await agentService.getAgentById(
                    parameters.agent_id
                );
                generalDescription = `${actorName} ${
                    isFirstPerson ? "look at" : "looks at"
                } ${agent.label}.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AROUND: {
                // A general description and then the description of the location, with various details.
                // <Agent> looks around.
                // <Description of location>
                generalDescription = `${actorName} ${
                    isFirstPerson ? "look around" : "looks around"
                }.`;
                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }

            case COMMAND_TYPE.LOOK_AT_EXIT: {
                // <Agent> looks at <Exit>
                // <Description of exit>
                const exit = await exitService.getById(parameters.exit_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "look at" : "looks at"
                } the ${exit.direction}.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }

            case COMMAND_TYPE.SPEAK_TO_AGENT: {
                // <SpeakingAgent> speaks to <TargetAgent>
                // <Speech>
                const targetAgent = await agentService.getAgentById(
                    parameters.target_agent_id
                );
                const targetAgentLocation = await targetAgent.location;

                generalDescription = `${actorName} ${
                    isFirstPerson ? "speak to" : "speaks to"
                } ${
                    parameters.target_agent_id === this.agent_id
                        ? "you"
                        : targetAgent.label
                }.`;

                if (this.output_text && (showPrivateDetail || isObserverPresent) ) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.UPDATE_AGENT_INTENT:
                generalDescription = `${actorName} ${
                    isFirstPerson ? "resolve" : "resolves"
                } to do something.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;

            case COMMAND_TYPE.UPDATE_AGENT_MOOD:
                generalDescription = `${actorName} ${
                    isFirstPerson ? "feel" : "feels"
                }.`;
                break;

            case COMMAND_TYPE.WAIT:
                generalDescription = `${actorName} ${
                    isFirstPerson ? "wait" : "waits"
                }.`;
                break;

            case COMMAND_TYPE.SEARCH_LOCATION: {
                const location = await locationService.getLocationById(
                    parameters.location_id
                );
                generalDescription = `${actorName} ${
                    isFirstPerson ? "search" : "searches"
                } ${location.label}.`;
                break;
            }

            case COMMAND_TYPE.GIVE_ITEM_TO_AGENT: {
                try {
                    const item = await itemService.getItemById(
                        parameters.item_id
                    );
                    const targetAgent = await agentService.getAgentById(
                        parameters.target_agent_id
                    );
                    generalDescription = `${actorName} ${
                        isFirstPerson ? "give" : "gives"
                    } the ${item.label} to ${targetAgent.label}.`;
                } catch (error) {
                    console.error(error);
                    generalDescription = `${actorName} ${
                        isFirstPerson ? "try to give" : "tries to give"
                    } something to someone, but it doesn't seem to work.`;
                }
                break;
            }

            case COMMAND_TYPE.GET_ITEM_FROM_ITEM: {
                const containerItem = await itemService.getItemById(parameters.container_item_id);
                const targetItem = await itemService.getItemById(parameters.target_item_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "get" : "gets"
                } the ${targetItem.label} from the ${containerItem.label}.`;
                break;
            }

            case COMMAND_TYPE.GET_INVENTORY: {
                // <Agent> checks their inventory.
                // <Description of inventory>
                generalDescription = `${actorName} ${
                    isFirstPerson ? "check" : "checks"
                } their inventory.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }

            case COMMAND_TYPE.ATTACK_AGENT: {
                const targetAgent = await agentService.getAgentById(
                    parameters.target_agent_id
                );
                generalDescription = `${actorName} ${
                    isFirstPerson ? "attack" : "attacks"
                } ${targetAgent.label}.`;
                if (this.output_text) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.SEARCH_LOCATION: {
                generalDescription = `${actorName} ${
                    isFirstPerson ? "search" : "searches"
                } the current location.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.SEARCH_ITEM: {
                const item = await itemService.getItemById(parameters.item_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "search" : "searches"
                } the ${item.label}.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.SEARCH_EXIT: {
                const exit = await exitService.getById(parameters.exit_id);
                generalDescription = `${actorName} ${
                    isFirstPerson ? "search" : "searches"
                } the ${exit.direction}.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.SPAWN_AGENT: {
                const creatureTemplateService = new CreatureTemplateService();
                const template = await creatureTemplateService.getTemplateById(parameters.template_id);
                generalDescription = `${template.name} arrives.`;

                if (this.output_text) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.REVEAL_ITEM: {
                const item = await itemService.getItemById(parameters.item_id);
                generalDescription = `A ${item.label} is revealed.`;

                // Always show extra detail for revealed items
                if (this.output_text) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.REVEAL_EXIT: {
                const exit = await exitService.getById(parameters.exit_id);
                generalDescription = `An exit to the ${exit.direction} is revealed.`;

                // Always show extra detail for revealed exits
                if (this.output_text) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.UNLOCK_EXIT: {
                const exit = await exitService.getById(parameters.exit_id);
                generalDescription = `The ${exit.name} is unlocked.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            case COMMAND_TYPE.UPDATE_ITEM_DESCRIPTION: {
                const item = await itemService.getItemById(parameters.item_id);
                generalDescription = `The ${item.label} has been changed.`;

                if (this.output_text && showPrivateDetail) {
                    extraDetail.push(this.output_text);
                }
                break;
            }
            // case COMMAND_TYPE.USE_ITEM: {
            //     const item = await itemService.getItemById(parameters.item_id);
            //     if (parameters.object_type === "agent") {
            //         const targetAgent = await agentService.getAgentById(parameters.object_id);  
            //         generalDescription = `${actorName} ${
            //             isFirstPerson ? "use" : "uses"
            //         } the ${item.label} on ${targetAgent.label}.`;
            //     } else if (parameters.object_type === "location") {
            //         const targetLocation = await locationService.getLocationById(parameters.object_id);
            //         generalDescription = `${actorName} ${
            //             isFirstPerson ? "use" : "uses"
            //         } the ${item.label} on ${targetLocation.label}.`;
            //     } else if (parameters.object_type === "item") {
            //         const targetItem = await itemService.getItemById(parameters.object_id);
            //         generalDescription = `${actorName} ${
            //             isFirstPerson ? "use" : "uses"
            //         } the ${item.label} on the ${targetItem.label}.`;
            //     } else if (parameters.object_type === "exit") {
            //         const exit = await exitService.getById(parameters.object_id);
            //         generalDescription = `${actorName} ${
            //             isFirstPerson ? "use" : "uses"
            //         } the ${item.label} on the ${exit.name}.`;
            //     }
            //     break;
            // }

            default:
                console.warn(`Unknown command type: ${this.command_type}`);
        }

        return {
            general_description: generalDescription,
            extra_detail: extraDetail
        };
    }
}
