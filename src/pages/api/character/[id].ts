import { NextApiRequest, NextApiResponse } from 'next'
import { initialiseDatabase } from '@/index'
import { CharacterService } from '@/services/Character.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	await initialiseDatabase();

	const characterService = new CharacterService()
	const { id } = req.query

	if (req.method === 'GET') {
		try {
			const character = await characterService.getCharacterById(id as string);
			if (character) {
				res.status(200).json(character.toDto())
			} else {
				res.status(404).json({ error: 'Character not found' })
			}
		} catch (error) {
			console.error('Error fetching character:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	} else {
		res.setHeader('Allow', ['GET'])
		res.status(405).end(`Method ${req.method} Not Allowed`)
	}
}
