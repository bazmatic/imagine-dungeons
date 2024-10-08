// TypeORM
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';


@Entity()
export class Command {
    @PrimaryGeneratedColumn()
    command_id: number;

    @Column()
    agent_id: string;

    @Column()
    raw_text: string;

    @Column()
    response: string;

    @CreateDateColumn()
    created_at: Date;
}