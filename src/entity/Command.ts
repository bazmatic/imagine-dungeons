// TypeORM
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';


@Entity()
export class Command {
    @PrimaryGeneratedColumn()
    command_id: number;

    @Column()
    agent_id: string;

    @Column()
    input_text?: string;

    @Column()
    response_text: string;

    @Column()
    raw_response?: string;

    @CreateDateColumn()
    created_at: Date;
}