import { NextApiRequest, NextApiResponse } from 'next'
import { initialiseDatabase } from '@/index'
import { AgentService } from '@/services/Agent.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	await initialiseDatabase();

	const agentService = new AgentService()
	const { id } = req.query

	if (req.method === 'GET') {
		try {
			const agent = await agentService.getAgentById(id as string);
			if (agent) {
				res.status(200).json(await agent.toDto())
			} else {
				res.status(404).json({ error: 'Agent not found' })
			}
		} catch (error) {
			console.error('Error fetching agent:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	} else {
		res.setHeader('Allow', ['GET'])
		res.status(405).end(`Method ${req.method} Not Allowed`)
	}
}
