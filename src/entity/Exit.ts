import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { BaseItem, GameObjectKind } from "./BaseItem";

@Entity()
export class Exit {
    @PrimaryGeneratedColumn()
    exit_id: number;

    kind: GameObjectKind = GameObjectKind.EXIT;

    @Column({name: "direction"})
    direction: string;

    @Column({name: "destination_id"})
    destination_id: number;

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "base_item_id" })
    base_item: BaseItem;
}