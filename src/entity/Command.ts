// TypeORM
import { COMMAND_TYPE } from '@/services/Interpreter';
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';


@Entity()
export class Command {
    @PrimaryGeneratedColumn()
    command_id: number;

    @Column()
    agent_id: string;

    @Column()
    input_text?: string;

    @Column({ type: "text" })
    command_type: COMMAND_TYPE;

    @Column({ type: "jsonb" })
    command_arguments: string;

    @Column()
    associated_agent_id?: string;

    @Column()
    output_text?: string;

    @Column({ type: "jsonb" })
    agents_present?: string[];

    @CreateDateColumn()
    created_at: Date;
}