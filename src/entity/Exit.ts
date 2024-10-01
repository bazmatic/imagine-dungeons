import { ViewEntity, PrimaryColumn, ViewColumn } from "typeorm";
import { GameObjectKind, IBaseProperties } from "./BaseItem";

@ViewEntity("v_exits")
export class Exit {
    @PrimaryColumn()
    exit_id: string;
    
    @ViewColumn({name: "destination_id"})
    destinationId: string;

    kind: GameObjectKind = GameObjectKind.EXIT;

    @ViewColumn({ name: "name"})
    name: string;

    @ViewColumn({ name: "short_description"})
    shortDescription: string;

    @ViewColumn({ name: "long_description"})
    longDescription: string;

    @ViewColumn({ name: "owner_id"})
    ownerId: string;

    @ViewColumn({name: "direction"})
    direction: string;

    // @OneToOne(() => BaseItem)
    // @JoinColumn({ name: "base_item_id" })
    // private baseItem: BaseItem;

    public toDto(): ExitDto {
        return {
            id: this.exit_id,
            name: this.name,
            ownerId: this.ownerId,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            destinationId: this.destinationId,
            direction: this.direction,
        }
    }
}

export class ExitDto implements IBaseProperties {
    id: string;
    name: string;
    ownerId: string;
    shortDescription: string;
    longDescription: string;
    destinationId: string;
    direction: string;
}