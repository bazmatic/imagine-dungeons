import {
    JoinColumn,
    OneToMany, PrimaryColumn,
    ViewColumn,
    ViewEntity
} from "typeorm";
import {
    GameObjectKind,
    IBaseProperties
} from "./BaseItem";
import { Exit, ExitDto } from "./Exit";
import { Item, ItemDto } from "./Item";
import { Character, CharacterDto } from "./Character";

@ViewEntity("v_locations")
export class Location implements IBaseProperties {
    @PrimaryColumn({ name: "location_id" })
    locationId: string;

    kind: GameObjectKind = GameObjectKind.LOCATION;

    @ViewColumn({ name: "name" })
    name: string;

    @ViewColumn({ name: "short_description" })
    shortDescription: string;

    @ViewColumn({ name: "long_description" })
    longDescription: string;

    @ViewColumn({ name: "owner_id" })
    ownerId: string;

    @OneToMany(() => Item, item => item.ownerId)
    @JoinColumn({ name: "location_id", referencedColumnName: "owner_id" })
    items: Item[];

    @OneToMany(() => Exit, exit => exit.ownerId)
    @JoinColumn({ name: "location_id", referencedColumnName: "owner_id" })
    exits: Exit[];

    @OneToMany(() => Character, character => character.ownerId)
    @JoinColumn({ name: "location_id", referencedColumnName: "owner_id" })
    characters: Character[];

    public async toDto(): Promise<LocationDto> {
        const items: Item[] = await this.items;
        //const characters: Character[] = await this.characters;
        return {
            id: this.locationId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerId,
            items: await Promise.all(items.map(item => item.toDto())),
            exits: this.exits.map(exit => exit.toDto()),
            characters: await Promise.all(this.characters.map(character => character.toDto()))
        };
    }
}

export class LocationDto implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    exits: ExitDto[];
    items: ItemDto[];
    characters: CharacterDto[];
}
