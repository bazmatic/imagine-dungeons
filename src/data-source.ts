import "reflect-metadata"
import { DataSource } from "typeorm"
import { BaseItem } from "./entity/BaseItem"
import { Exit } from "./entity/Exit"
import { Item } from "./entity/Item"
import { Character } from "./entity/Character"
import { Location } from "./entity/Location"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "baz",
    password: "baz",
    database: "imagine_dungeons",
    synchronize: false,
    logging: true,
    entities: [
        // User,
        BaseItem,
        Location,
        Exit,
        Item,
        Character,
    ],
    migrations: [],
    subscribers: [],
})
