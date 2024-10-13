import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";
import { Agent } from "./Agent";
import { Location } from "./Location";

@Entity("item")
export class Item implements IBaseProperties {
    @PrimaryColumn({ name: "item_id" })
    itemId: string;

    @Column({ name: "name" })
    label: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "owner_agent_id", nullable: true })
    ownerAgentId?: string | null;

    @Column({ name: "owner_location_id", nullable: true })
    ownerLocationId?: string | null;

    @Column({ name: "owner_item_id", nullable: true })
    ownerItemId?: string | null;

    @Column({ name: "capacity" })
    capacity: number;

    @Column()
    weight: number;

    @Column({ name: "hidden", default: false })
    hidden: boolean;

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
            label: this.label,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerAgentId || this.ownerLocationId || this.ownerItemId || undefined,
            ownerKind: this.ownerAgentId ? GameObjectKind.AGENT : this.ownerLocationId ? GameObjectKind.LOCATION : this.ownerItemId ? GameObjectKind.ITEM : undefined,
            capacity: this.capacity,
            weight: this.weight,
            items: await Promise.all(items.map(item => item.toDto()))
        };
    }
}

export class ItemDto {
    id: string;
    label: string;
    shortDescription: string;
    longDescription: string;
    ownerId?: string;
    ownerKind?: GameObjectKind;
    capacity: number;
    weight: number;
    items: ItemDto[];
}