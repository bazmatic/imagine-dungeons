import { Entity, Column, JoinColumn, ManyToOne, OneToMany, PrimaryColumn } from "typeorm";
import { IBaseProperties } from "./BaseItem";

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

    @ManyToOne(() => Item, owner => owner.items, { lazy: true })
    @JoinColumn({ name: "owner_id", referencedColumnName: "itemId" })
    owner: Promise<Item>;

    @OneToMany(() => Item, item => item.owner, { lazy: true })
    @JoinColumn({ name: "item_id", referencedColumnName: "ownerId" })
    items: Promise<Item[]>;

    public async toDto(): Promise<ItemDto> {
        const items: Item[] = await this.items;
        return {
            id: this.itemId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerId,
            capacity: this.capacity,
            weight: this.weight,
            items: await Promise.all(items.map(item => item.toDto()))
        }
    }
}

export class ItemDto implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    capacity: number;
    weight: number;
    items: ItemDto[];
}