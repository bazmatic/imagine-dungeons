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

    @Column({ name: "owner_id" })
    ownerId: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column()
    capacity: number;

    @Column()
    backstory: string;

    // Relation to Items owned by the Agent
    @OneToMany(() => Item, item => item.ownerAgent, { lazy: true })
    items: Promise<Item[]>;

    // Relation to Location (Owner)
    @ManyToOne(() => Location, location => location.agents, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_id", referencedColumnName: "locationId" })
    location: Promise<Location>;

    public async toDto(): Promise<AgentDto> {
        const items: Item[] = await this.items;
        return {
            id: this.agentId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerId,
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
    ownerId: string;
    capacity: number;
    backstory: string;
    items: ItemDto[];
}