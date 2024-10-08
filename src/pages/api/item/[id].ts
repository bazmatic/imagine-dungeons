import { initialiseDatabase } from "@/index";
import { ItemService } from "@/services/Item.service";
import { NextApiRequest, NextApiResponse } from "next";


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await initialiseDatabase();
    const itemService = new ItemService();
    const id = req.query.id as string;
    const item = await itemService.getItemById(id);
    const itemDto = await item.toDto();
    res.status(200).json(itemDto);
}
