import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    OneToMany,
    JoinColumn,
} from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";
import { Location } from "./Location";
import { Item, ItemDto } from "./Item";

@Entity("agent")
export class Agent implements IBaseProperties {
    @PrimaryColumn({ name: "agent_id" })
    agentId: string;

    kind: GameObjectKind = GameObjectKind.AGENT;

    @Column({ name: "name" })
    name: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "owner_location_id" })
    ownerLocationId: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "mood" })
    mood: string;

    @Column({ name: "backstory" })
    backstory: string;

    @Column({ name: "current_intent" })
    currentIntent: string;
    
    @Column()
    capacity: number;

    @Column({ name: "goal" })
    goal: string;

    // Relation to Items owned by the Agent
    @OneToMany(() => Item, item => item.ownerAgent, { lazy: true })
    items: Promise<Item[]>;

    // Relation to Location (Owner)
    @ManyToOne(() => Location, location => location.agents, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_location_id", referencedColumnName: "locationId" })
    location: Promise<Location>;

    @Column({ name: "autonomous" })
    autonomous: boolean;

    public async toDto(): Promise<AgentDto> {
        const items: Item[] = await this.items;
        return {
            id: this.agentId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            locationId: this.ownerLocationId,
            capacity: this.capacity,
            backstory: this.backstory,
            items: await Promise.all(items.map(item => item.toDto()))
        };
    }
}

export class AgentDto implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    locationId: string;
    capacity: number;
    backstory: string;
    items: ItemDto[];
}