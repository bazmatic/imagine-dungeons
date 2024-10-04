import {
    Entity,
    PrimaryColumn,
    Column,
    ManyToOne,
    JoinColumn
} from "typeorm";
import { Location } from "./Location";

export class ExitDto {
    id: string;
    name: string;
    locationId: string;
    shortDescription: string;
    longDescription: string;
    destinationId: string;
    direction: string;
}

@Entity("exit")
export class Exit {
    @PrimaryColumn({ name: "exit_id" })
    exitId: string;

    @Column({ name: "destination_id" })
    destinationId: string;

    @Column({ name: "name" })
    name: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column({ name: "owner_location_id" })
    ownerLocationId: string;

    @Column({ name: "direction" })
    direction: string;

    @ManyToOne(() => Location, location => location.exits, { lazy: true })
    @JoinColumn({ name: "owner_location_id", referencedColumnName: "locationId" })
    location: Promise<Location>;

    public async toDto(): Promise<ExitDto> {
        return {
            id: this.exitId,
            name: this.name,
            locationId: this.ownerLocationId,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            destinationId: this.destinationId,
            direction: this.direction,
        };
    }
}