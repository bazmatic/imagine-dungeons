import { Entity, Column, ManyToOne, JoinColumn, OneToMany, PrimaryColumn } from "typeorm";

export enum GameObjectKind {
    ITEM = "item",
    LOCATION = "location",
    EXIT = "exit",
    CHARACTER = "character"
}

export interface IBaseProperties {
    name: string;
    shortDescription: string;
    longDescription: string;
    //kind: GameObjectKind;
    ownerId: string;
}

@Entity("base_item")
export class BaseItem implements IBaseProperties {
    @PrimaryColumn({ name: "base_item_id" })
    base_item_id: string;

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
    ownerId: string;

    @ManyToOne(() => BaseItem, baseItem => baseItem.contents)
    @JoinColumn({ name: "owner_id", referencedColumnName: "base_item_id" })
    owner: BaseItem;

    @OneToMany(() => BaseItem, baseItem => baseItem.owner, { eager: true })
    contents: BaseItem[];

    public toDto(): BaseItemDto {
        return {
            id: this.base_item_id,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            kind: this.kind,
            ownerId: this.ownerId,
        }
    }
}

export interface BaseItemDto {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    kind: GameObjectKind;
    ownerId: string;
}