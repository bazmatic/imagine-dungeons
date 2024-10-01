import {
    JoinColumn,
    OneToMany,
    OneToOne,
    PrimaryColumn,
    ViewColumn,
    ViewEntity
} from "typeorm";
import {
    BaseItem,
    BaseItemDto,
    GameObjectKind,
    IBaseProperties
} from "./BaseItem";
import { Exit, ExitDto } from "./Exit";

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

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "location_id", referencedColumnName: "base_item_id" })
    baseItem: BaseItem;

    @OneToMany(() => Exit, exit => exit.location)
    exits: Exit[];

    get containedItems(): BaseItem[] {
        return this.baseItem.contents.filter(
            item => item.kind === GameObjectKind.ITEM
        );
    }

    get characters(): BaseItem[] {
        return this.baseItem.contents.filter(
            item => item.kind === GameObjectKind.CHARACTER
        );
    }

    public toDto(): LocationDto {
        return {
            id: this.locationId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            ownerId: this.ownerId,
            items: this.containedItems.map(item => item.toDto()),
            exits: this.exits.map(exit => exit.toDto()),
            characters: this.characters.map(character => character.toDto())
        };
    }
}

export class LocationDto implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    ownerId: string;
    exits: ExitDto[]; //BaseItemDto[];
    items: BaseItemDto[];
    characters: BaseItemDto[];
}
