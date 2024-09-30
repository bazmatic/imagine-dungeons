import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    OneToOne,
    JoinColumn,
    ManyToOne
} from "typeorm";
import { BaseItem, GameObjectKind } from "./BaseItem";
import { Item } from "./Item";
import { Location } from "./Location";

@Entity("character")
export class Character {
    @PrimaryGeneratedColumn()
    character_id: number;

    kind: GameObjectKind = GameObjectKind.CHARACTER;

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "base_item_id" })
    base_item: BaseItem;

    @Column()
    capacity: number;

    @Column()
    backstory: string;

    // The character's location is the owner of the base_item
    @ManyToOne(() => Location, location => location.characters)
    location: Location;
}
