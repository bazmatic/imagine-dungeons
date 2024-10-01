import {
    OneToOne,
    JoinColumn,
    ManyToOne,
    PrimaryColumn,
    ViewEntity,
    ViewColumn
} from "typeorm";
import { BaseItem, BaseItemDto, GameObjectKind, IBaseProperties } from "./BaseItem";

import { Location } from "./Location";

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

    @OneToOne(() => BaseItem)
    @JoinColumn({ name: "character_id", referencedColumnName: "base_item_id" })
    baseItem: BaseItem;

    @ViewColumn()
    capacity: number;

    @ViewColumn()
    backstory: string;

    // The character's location is the owner of the base_item
    @ManyToOne(() => Location, location => location.characters)
    @JoinColumn({ name: "owner_id", referencedColumnName: "locationId" })
    location: Location;

    get containedItems(): BaseItem[] {
        return this.baseItem.contents.filter((item) => item.kind === GameObjectKind.ITEM);
    }

    public toDto(): CharacterDto {
        return {
            id: this.character_id,
            name: this.baseItem.name,
            shortDescription: this.baseItem.shortDescription,
            longDescription: this.baseItem.longDescription,
            kind: this.baseItem.kind,
            ownerId: this.baseItem.ownerId,
            capacity: this.capacity,
            backstory: this.backstory,
            locationId: this.location?.locationId,
            containedItems: this.containedItems.map(item => item.toDto())
        };
    }
}

export class CharacterDto implements IBaseProperties {
    id: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    kind: GameObjectKind;
    ownerId: string;
    capacity: number;
    backstory: string;
    locationId: string;
    containedItems: BaseItemDto[];
}