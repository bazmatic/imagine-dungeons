import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { IBaseProperties } from "./BaseItem";
import { Agent } from "./Agent";
import { Location } from "./Location";

@Entity("item")
export class Item implements IBaseProperties {
    @PrimaryColumn({ name: "item_id" })
    itemId: string;

    @Column({ name: "name" })
    name: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "owner_agent_id", nullable: true })
    ownerAgentId: string;

    @Column({ name: "owner_location_id", nullable: true })
    ownerLocationId: string;

    @Column({ name: "owner_item_id", nullable: true })
    ownerItemId: string;

    @Column({ name: "capacity" })
    capacity: number;

    @Column()
    weight: number;

    // Relation to Agent
    @ManyToOne(() => Agent, agent => agent.items, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_agent_id", referencedColumnName: "agentId" })
    ownerAgent: Promise<Agent>;

    // Relation to Location
    @ManyToOne(() => Location, location => location.items, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_location_id", referencedColumnName: "locationId" })
    ownerLocation: Promise<Location>;

    // Relation to another Item (for nested items)
    @ManyToOne(() => Item, item => item.items, { lazy: true, nullable: true })
    @JoinColumn({ name: "owner_item_id", referencedColumnName: "itemId" })
    ownerItem: Promise<Item>;

    // One-to-Many relation to Items (children)
    @OneToMany(() => Item, item => item.ownerItem, { lazy: true })
    items: Promise<Item[]>;

    public async toDto(): Promise<ItemDto> {
        const items: Item[] = await this.items;
        return {
            id: this.itemId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerAgentId || this.ownerLocationId || this.ownerItemId,
            capacity: this.capacity,
            weight: this.weight,
            items: await Promise.all(items.map(item => item.toDto()))
        };
    }
}

export class ItemDto {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    capacity: number;
    weight: number;
    items: ItemDto[];
}