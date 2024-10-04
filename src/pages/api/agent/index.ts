import { NextApiRequest, NextApiResponse } from 'next'
import { initialiseDatabase } from '@/index'
import { AgentService } from '@/services/Agent.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	await initialiseDatabase();

	const agentService = new AgentService()

	if (req.method === 'GET') {
		try {
			const agents = await agentService.getAllAgents();
			const agentDtoList = agents.map((agent) => {
				return agent.toDto()
			});
			res.status(200).json(agentDtoList)
		} catch (error) {
			console.error('Error fetching agents:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	} else {
		res.setHeader('Allow', ['GET'])
		res.status(405).end(`Method ${req.method} Not Allowed`)
	}
}
