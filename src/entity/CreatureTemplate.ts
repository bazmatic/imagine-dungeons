// src/entity/CreatureTemplate.ts
import { Entity, PrimaryColumn, Column, ManyToMany, JoinTable } from "typeorm";
import { Location } from "./Location";

@Entity("creature_template")
export class CreatureTemplate {
    @PrimaryColumn({ name: "template_id" })
    templateId: string;

    @Column()
    name: string;

    @Column({ name: "short_description" })
    shortDescription: string;

    @Column({ name: "long_description" })
    longDescription: string;

    @Column()
    capacity: number;

    @Column()
    health: number;

    @Column()
    damage: number;

    @Column()
    defence: number;

    @Column()
    backstory: string;

    @Column({ nullable: true })
    mood: string;

    @Column({ nullable: true })
    notes: string;

    @ManyToMany(() => Location)
    @JoinTable({
        name: "creature_template_location",
        joinColumn: {
            name: "template_id",
            referencedColumnName: "templateId"
        },
        inverseJoinColumn: {
            name: "location_id",
            referencedColumnName: "locationId"
        }
    })
    locations: Location[];

    toDto(system: boolean): CreatureTemplateDto {
        return {
            templateId: this.templateId,
            name: this.name,
            shortDescription: this.shortDescription,
            longDescription: this.longDescription,
            capacity: this.capacity,
            health: this.health,
            damage: this.damage,
            defence: this.defence,
            mood: this.mood,
            notes: this.notes,
        };
    }
}

export class CreatureTemplateDto {
    templateId: string;
    name: string;
    shortDescription: string;
    longDescription: string;
    capacity: number;
    health: number;
    damage: number;
    defence: number;
    mood: string;
    notes: string;
}
