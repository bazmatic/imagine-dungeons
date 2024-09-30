// import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, ManyToOne, OneToMany } from "typeorm";

// export enum GameObjectKind {
//     ITEM = 'item',
//     LOCATION = 'location',
//     EXIT = 'exit',
//     CHARACTER = 'character'
// }

// @Entity()
// export class BaseItem {
//     @PrimaryGeneratedColumn()
//     id: number;

//     @Column()
//     name: string;

//     @Column()
//     short_description: string;

//     @Column()
//     long_description: string;

//     @ManyToOne(() => BaseItem, { nullable: true })
//     @JoinColumn({ name: "owner_id" })
//     owner: BaseItem | null;

//     @Column({
//         type: "enum",
//         enum: GameObjectKind,
//         nullable: false
//     })
//     kind: GameObjectKind;
// }

// @Entity()
// export class Item {
//     @PrimaryGeneratedColumn()
//     id: number;

//     @OneToOne(() => BaseItem)
//     @JoinColumn({ name: "id" })
//     base_item: BaseItem;

//     @Column()
//     capacity: number;

//     @Column()
//     weight: number;

//     @OneToMany(() => Item, item => item.base_item.owner)
//     inventory: Item[];
// }

// @Entity()
// export class Location {
//     @PrimaryGeneratedColumn()
//     id: number;

//     @OneToOne(() => BaseItem)
//     @JoinColumn({ name: "id" })
//     base_item: BaseItem;

//     @OneToMany(() => Exit, exit => exit.base_item.owner)
//     exits: Exit[];

//     @OneToMany(() => Item, item => item.base_item.owner)
//     inventory: Item[];

//     @OneToMany(() => Character, character => character.base_item.owner)
//     characters: Character[];
// }

// @Entity()
// export class Exit {
//     @PrimaryGeneratedColumn()
//     id: number;

//     @Column()
//     direction: string;

//     @OneToOne(() => BaseItem)
//     @JoinColumn({ name: "id" })
//     base_item: BaseItem;

//     @OneToOne(() => Location)
//     @JoinColumn({ name: "destination_id" })
//     destination: Location;
// }

// @Entity()
// export class Character {
//     @PrimaryGeneratedColumn()
//     id: number;

//     @OneToOne(() => BaseItem)
//     @JoinColumn({ name: "id" })
//     base_item: BaseItem;

//     @Column()
//     capacity: number;

//     @Column()
//     long_description: string;

//     @Column()
//     backstory: string;

//     @OneToMany(() => Item, item => item.base_item.owner)
//     inventory: Item[];

//     // The character's location is the owner of the base_item
//     @ManyToOne(() => Location, location => location.characters)
//     location: Location;
// }