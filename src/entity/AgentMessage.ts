import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from "typeorm";

@Entity()
export class AgentMessage {
    @PrimaryGeneratedColumn({ name: "message_id" })
    messageId: string;

    @Column({ name: "sender_agent_id" })
    senderAgentId: string;
    
    @Column({ name: "receiver_agent_id" })
    receiverAgentId: string;

    @Column({ name: "content" })
    content: string;
}

