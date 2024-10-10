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
    label: string;

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

    @Column({ name: "goal" })
    goal: string;

    @Column({ name: "current_intent" })
    currentIntent: string;
    
    @Column()
    capacity: number;

    @Column()
    health: number;

    @Column()
    damage: number;

    // Relation to Items owned by the Agent
    @OneToMany(() => Item, item => item.ownerAgent, { lazy: true })
    items: Promise<Item[]>;

    // Relation to Location (Owner)
    @ManyToOne(() => Location, location => location.agents, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_location_id", referencedColumnName: "locationId" })
    location: Promise<Location>;

    @Column({ name: "autonomous" })
    autonomous: boolean;

    @Column({ name: "activated" })
    activated: boolean;

    public async toDto(): Promise<AgentDto> {
        const items: Item[] = await this.items;
        return {
            id: this.agentId,
            label: this.label,
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
    label: string;
    shortDescription: string;
    longDescription: string;
    locationId: string;
    capacity: number;
    backstory: string;
    items: ItemDto[];
}