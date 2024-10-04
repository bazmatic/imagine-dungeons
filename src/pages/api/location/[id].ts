
import { initialiseDatabase } from "@/index";
import { LocationService } from "@/services/Location.service";

import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await initialiseDatabase();
    const locationService  = new LocationService();
    const id = req.query.id as string;
    const location = await locationService.getLocationById(id);
    res.status(200).json(await location.toDto());
}
