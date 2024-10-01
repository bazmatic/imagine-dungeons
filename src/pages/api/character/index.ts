import { NextApiRequest, NextApiResponse } from 'next'
import { initialiseDatabase } from '@/index'
import { CharacterService } from '@/services/Character.service'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	await initialiseDatabase();

	const characterService = new CharacterService()

	if (req.method === 'GET') {
		try {
			const characters = await characterService.getAllCharacters();
			const characterDtoList = characters.map((character) => {
				return character.toDto()
			});
			res.status(200).json(characterDtoList)
		} catch (error) {
			console.error('Error fetching characters:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	} else {
		res.setHeader('Allow', ['GET'])
		res.status(405).end(`Method ${req.method} Not Allowed`)
	}
}
