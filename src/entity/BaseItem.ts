import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, OneToMany } from "typeorm";
import { InventoryItem, Item } from "./Item";
import { Exit } from "./Exit";
import { Character } from "./Character";

export enum GameObjectKind {
    ITEM = "item",
    LOCATION = "location",
    EXIT = "exit",
    CHARACTER = "character"
}

@Entity("base_item")
export class BaseItem {
    @PrimaryGeneratedColumn()
    base_item_id: number;

    @Column({ name: "name"})
    name: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({
        name: "kind",
        type: "enum",
        enum: GameObjectKind
    })
    kind: GameObjectKind;
    @Column({
        name: "owner_id",
        nullable: true
    })
    owner_id: number;

    @ManyToOne(() => BaseItem, baseItem => baseItem.inventory)
    @JoinColumn({ name: "owner_id" })
    owner: BaseItem;

    @OneToMany(() => BaseItem, baseItem => baseItem.owner)
    inventory: BaseItem[];
}

