import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { IBaseProperties } from "./BaseItem";
import { Agent } from "./Agent";
import { Location } from "./Location";

@Entity("item")
export class Item implements IBaseProperties {
    @PrimaryColumn({ name: "item_id"})
    itemId: string;

    @Column({ name: "name"})
    name: string;

    @Column({ name: "short_description"})
    shortDescription: string;

    @Column({ name: "long_description"})
    longDescription: string;

    @Column({ name: "owner_id"})
    ownerId: string;

    @Column({name: "capacity"})
    capacity: number;

    @Column()
    weight: number;

    @ManyToOne(() => Agent, agent => agent.items, { lazy: true, nullable: true }) // Owner can be an Agent
    @JoinColumn({ name: "owner_id", referencedColumnName: "agentId" }) // Reference to Agent
    ownerAgent: Promise<Agent>; // New property for Agent owner

    @ManyToOne(() => Item, item => item.items, { lazy: true, nullable: true }) // Owner can be another Item
    @JoinColumn({ name: "owner_id", referencedColumnName: "itemId" }) // Reference to parent Item
    ownerItem: Promise<Item>; // New property for Item owner

    @ManyToOne(() => Location, location => location.items, { nullable: true }) // Owner can be a Location
    @JoinColumn({ name: "owner_id", referencedColumnName: "locationId" }) // Reference to Location
    ownerLocation: Promise<Location>; // New property for Location owner

    @OneToMany(() => Item, item => item.ownerItem, { lazy: true })
    items: Promise<Item[]>;

    public async toDto(): Promise<ItemDto> {
        const items: Item[] = await this.items;
        return {
            id: this.itemId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerId,
            // ownerItemId: this.ownerItemId,
            // ownerAgentId: this.ownerAgentId,
            capacity: this.capacity,
            weight: this.weight,
            items: await Promise.all(items.map(item => item.toDto()))
        }
    }
}

export class ItemDto { //} implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    capacity: number;
    weight: number;
    items: ItemDto[];
}