import {
    Entity,
    OneToMany,
    PrimaryColumn,
    Column,
    ManyToMany,
    JoinTable,
} from "typeorm";

import { Exit, ExitDto } from "./Exit";
import { Item, ItemDto } from "./Item";
import { Agent, AgentDto } from "./Agent";
import { CreatureTemplate, CreatureTemplateDto } from "./CreatureTemplate";

export class LocationDto {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    exits: ExitDto[];
    items: ItemDto[];
    agents: AgentDto[];
    notes?: string;
    creatureTemplates?: CreatureTemplateDto[];
}

@Entity("location")
export class Location {
    @PrimaryColumn({ name: "location_id" })
    locationId: string;

    @Column({ name: "name" })
    label: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "notes" })
    notes: string;

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

    // Creature templates that might spawn in this location
    @ManyToMany(() => CreatureTemplate)
    @JoinTable({
        name: "creature_template_location",
        joinColumn: {
            name: "location_id",
            referencedColumnName: "locationId"
        },
        inverseJoinColumn: {
            name: "template_id",
            referencedColumnName: "templateId"
        }
    })
    creatureTemplates: CreatureTemplate[];

    public async toDto(system: boolean = false): Promise<LocationDto> {
        const items: Item[] = await this.items;
        const exits: Exit[] = await this.exits;
        const agents: Agent[] = await this.agents;
        const creatureTemplates: CreatureTemplate[] = await this.creatureTemplates;

        return {
            id: this.locationId,
            name: this.label,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            items: await Promise.all(items.map(item => item.toDto(system))),
            exits: await Promise.all(exits.map(exit => exit.toDto(system))),
            agents: await Promise.all(agents.map(agent => agent.toDto(system))),
            notes: system ? this.notes : undefined,
            creatureTemplates: system ? creatureTemplates.map(template => template.toDto(system)) : undefined
        };
    }
}
