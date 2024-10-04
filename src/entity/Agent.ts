import {
    ManyToOne,
    PrimaryColumn,
    ViewEntity,
    ViewColumn,
    JoinColumn,
    OneToMany,
    Entity,
    Column
} from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";

import { Location, LocationDto } from "./Location";
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

    @OneToMany(() => Item, item => item.ownerAgent, { lazy: true })
    @JoinColumn({ name: "agent_id", referencedColumnName: "ownerId" })
    items: Promise<Item[]>;

    @ManyToOne(() => Location, location => location.agents, { lazy: true, nullable: true }) // Owner can be a Location
    @JoinColumn({ name: "agent_id", referencedColumnName: "ownerId" }) // Reference to Location
    location: Promise<Location>;

    @Column()
    capacity: number;

    @Column()
    backstory: string;

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
