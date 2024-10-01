import { JoinColumn, ManyToOne, OneToOne, PrimaryColumn, ViewColumn, ViewEntity } from "typeorm";
import { BaseItem, BaseItemDto, GameObjectKind, IBaseProperties } from "./BaseItem";
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

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "item_id", referencedColumnName: "base_item_id" })
    baseItem: BaseItem;

    // @ManyToOne(() => Location, location => location.containedItems)
    // @JoinColumn({ name: "owner_id", referencedColumnName: "locationId" })
    // location?: Location;

    @ViewColumn({name: "capacity"})
    capacity: number;

    @ViewColumn()
    weight: number;

    get items(): BaseItem[] {
        return this.baseItem.contents.filter((item) => item.kind === GameObjectKind.ITEM);
    }

    public toDto(): ItemDto {
        return {
            id: this.itemId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            kind: this.kind,
            ownerId: this.ownerId,
            capacity: this.capacity,
            weight: this.weight,
            containedItems: this.items.map((item) => item.toDto()),
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
    containedItems: BaseItemDto[];
}