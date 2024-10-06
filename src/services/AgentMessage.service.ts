
import { AppDataSource } from "@/data-source";
import { In, Repository } from "typeorm";
import { AgentMessage } from "@/entity/AgentMessage";

export class AgentMessageService {
    private agentMessageRepository: Repository<AgentMessage>;

    constructor() {
        this.agentMessageRepository = AppDataSource.getRepository(AgentMessage);
    }

    async getMessagesBetweenAgents(meAgentId: string, youAgentId: string): Promise<AgentMessage[]> {
        return this.agentMessageRepository.find({
            where: {
                senderAgentId: In([meAgentId, youAgentId]),
                receiverAgentId: In([meAgentId, youAgentId])
            }
        });
    }

    async createMessage(senderAgentId: string, receiverAgentId: string, content: string): Promise<AgentMessage> {
        const message = new AgentMessage();
        message.senderAgentId = senderAgentId;
        message.receiverAgentId = receiverAgentId;
        message.content = content;
        return this.agentMessageRepository.save(message);
    }

    async toDto(agentMessage: AgentMessage): Promise<AgentMessageDto> {
        return {
            messageId: agentMessage.messageId,
            senderAgentId: agentMessage.senderAgentId,
            receiverAgentId: agentMessage.receiverAgentId,
            content: agentMessage.content
        };
    }    
}

export interface AgentMessageDto {
    messageId: string;
    senderAgentId: string;
    receiverAgentId: string;
    content: string;
}

