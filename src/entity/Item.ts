import { Column, Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseItem, GameObjectKind } from "./BaseItem";
import { Exit } from "./Exit";
import { Character } from "./Character";
import { Location } from "./Location";

export type InventoryItem = Item | Exit | Character | Location;

@Entity("item")
export class Item {
    @PrimaryGeneratedColumn()
    item_id: number;

    kind: GameObjectKind = GameObjectKind.ITEM;

    // @OneToOne(() => BaseItem)
    // @JoinColumn({ name: "base_item_id" })
    // base_item: BaseItem;

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "item_id", referencedColumnName: "base_item_id" })
    base_item: BaseItem;

    @Column({name: "capacity", type: "integer"})
    capacity: number;

    @Column()
    weight: number;

}
