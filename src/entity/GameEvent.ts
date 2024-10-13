// TypeORM

import { COMMAND_TYPE } from '@/services/Interpreter';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';


@Entity()
export class GameEvent {
    @PrimaryGeneratedColumn()
    game_event_id: number;

    @Column()
    agent_id?: string;

    @Column()
    location_id?: string;
    
    @Column()
    input_text?: string;

    @Column({ type: "text" })
    command_type: COMMAND_TYPE;

    @Column({ type: "jsonb" })
    command_arguments: string;

    get arguments(): Record<string, unknown> {
        return JSON.parse(this.command_arguments);
    }

    @Column()
    output_text?: string;

    @Column({ type: "jsonb" })
    agents_present?: string[];

    @CreateDateColumn()
    created_at: Date;
}