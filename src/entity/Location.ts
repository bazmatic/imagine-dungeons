import {
    Entity,
    OneToMany,
    PrimaryColumn,
    Column,
} from "typeorm";

import { Exit, ExitDto } from "./Exit";
import { Item, ItemDto } from "./Item";
import { Agent, AgentDto } from "./Agent";

export class LocationDto {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    exits: ExitDto[];
    items: ItemDto[];
    agents: AgentDto[];
}

@Entity("location")
export class Location {
    @PrimaryColumn({ name: "location_id" })
    locationId: string;

    @Column({ name: "name" })
    name: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "owner_id" })
    ownerId: string;

    // Items whose owner is this location
    @OneToMany(() => Item, item => item.ownerLocation, { lazy: true })
    items: Promise<Item[]>;

    // Exits for this location
    @OneToMany(() => Exit, exit => exit.location, { lazy: true })
    exits: Promise<Exit[]>;

    // Agents in this location
    @OneToMany(() => Agent, agent => agent.location, { lazy: true })
    agents: Promise<Agent[]>;

    public async toDto(): Promise<LocationDto> {
        const items: Item[] = await this.items;
        const exits: Exit[] = await this.exits;
        const agents: Agent[] = await this.agents;

        return {
            id: this.locationId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            items: await Promise.all(items.map(item => item.toDto())),
            exits: await Promise.all(exits.map(exit => exit.toDto())),
            agents: await Promise.all(agents.map(agent => agent.toDto()))
        };
    }
}