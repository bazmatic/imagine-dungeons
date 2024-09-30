// Next.js API route support: https://nextjs.org/docs/api-routes/introduction

import type { NextApiRequest, NextApiResponse } from "next";
import { AppDataSource } from "@/data-source";
import { BaseItemService } from "@/services/BaseItem.service";
import { ItemService } from "@/services/Item.service";


export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>,
) {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
  const itemService = new ItemService();
  const item = await itemService.getItemById(8);
  if (!item) {
    res.status(404).json({ error: "Item not found" });
    return;
  } else {
    res.status(200).json(item);
  }

}
