import { NextApiRequest, NextApiResponse } from 'next'

import { ItemService } from '@/services/Item.service'
import { initialiseDatabase } from '@/index'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	await initialiseDatabase();

	const itemService = new ItemService()

	if (req.method === 'GET') {
		try {
			const items = await itemService.getAllItems()
			res.status(200).json(items)
		} catch (error) {
			console.error('Error fetching items:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	} else {
		res.setHeader('Allow', ['GET'])
		res.status(405).end(`Method ${req.method} Not Allowed`)
	}
}
