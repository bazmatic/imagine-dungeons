import { JoinColumn, ManyToOne, OneToMany, PrimaryColumn, ViewColumn, ViewEntity } from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";
import { Exit } from "./Exit";
import { Character } from "./Character";
import { Location } from "./Location";

export type InventoryItem = Item | Exit | Character | Location;

@ViewEntity("v_items")
export class Item implements IBaseProperties {
    @PrimaryColumn({ name: "item_id"})
    itemId: string;

    kind: GameObjectKind = GameObjectKind.ITEM;

    @ViewColumn({ name: "name"})
    name: string;

    @ViewColumn({ name: "short_description"})
    shortDescription: string;

    @ViewColumn({ name: "long_description"})
    longDescription: string;

    @ViewColumn({ name: "owner_id"})
    ownerId: string;

    @ViewColumn({name: "capacity"})
    capacity: number;

    @ViewColumn()
    weight: number;

    @ManyToOne(() => Item, owner => owner.items)
    @JoinColumn({ name: "owner_id", referencedColumnName: "itemId" })
    owner: Item;

    @OneToMany(() => Item, item => item.owner, { lazy: true })
    items: Promise<Item[]>;

    public async toDto(): Promise<ItemDto> {
        const items: Item[] = await this.items;
        return {
            id: this.itemId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            kind: this.kind,
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
    kind: GameObjectKind;
    ownerId: string;
    capacity: number;
    weight: number;
    items: ItemDto[];
}