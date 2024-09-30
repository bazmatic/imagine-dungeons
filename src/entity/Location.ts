import { Entity, JoinColumn, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseItem, GameObjectKind } from "./BaseItem";
import { Character } from "./Character";
import { Item } from "./Item";
import { Exit } from "./Exit";

@Entity()
export class Location {
    @PrimaryGeneratedColumn()
    location_id: number;

    kind: GameObjectKind = GameObjectKind.LOCATION;

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "location_id", referencedColumnName: "base_item_id" })
    base_item: BaseItem;



    exits: Exit[];
    characters: Character[];
    items: Item[];
}