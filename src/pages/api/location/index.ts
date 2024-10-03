import { NextApiRequest, NextApiResponse } from 'next'
import { initialiseDatabase } from '@/index'
import { LocationService } from '@/services/Location.service';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
	await initialiseDatabase();

	const locationService = new LocationService()

	if (req.method === 'GET') {
		try {
			const locations = await locationService.getAllLocations();
            const locationDtoList = await Promise.all(locations.map(async location => {
                return location.toDto();
            }));
			res.status(200).json(locationDtoList)
		} catch (error) {
			console.error('Error fetching locations:', error)
			res.status(500).json({ error: 'Internal Server Error' })
		}
	} else {
		res.setHeader('Allow', ['GET'])
		res.status(405).end(`Method ${req.method} Not Allowed`)
	}
}
