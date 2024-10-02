import {
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    ViewEntity,
    ViewColumn,
    OneToMany
} from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";

import { Location } from "./Location";
import { Item, ItemDto } from "./Item";

@ViewEntity("v_characters")
export class Character implements IBaseProperties {
    @PrimaryColumn()
    character_id: string;

    kind: GameObjectKind = GameObjectKind.CHARACTER;

    @ViewColumn({ name: "name"})
    name: string;

    @ViewColumn({ name: "short_description"})
    shortDescription: string;

    @ViewColumn({ name: "owner_id"})
    ownerId: string;

    @ViewColumn({ name: "long_description"})
    longDescription: string;

    @OneToMany(() => Item, item => item.owner)
    //@JoinColumn({ name: "character_id", referencedColumnName: "owner_id" })
    items: Item[];

    @ViewColumn()
    capacity: number;

    @ViewColumn()
    backstory: string;

    // The character's location is the owner of the base_item
    @ManyToOne(() => Location, location => location.characters)
    @JoinColumn({ name: "owner_id", referencedColumnName: "locationId" })
    location: Location;

    public async toDto(): Promise<CharacterDto> {
        return {
            id: this.character_id,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerId,
            capacity: this.capacity,
            backstory: this.backstory,
            locationId: this.location?.locationId,
            items: await Promise.all(this.items.map(item => item.toDto()))
        };
    }
}

export class CharacterDto implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    capacity: number;
    backstory: string;
    locationId: string;
    items: ItemDto[];
}