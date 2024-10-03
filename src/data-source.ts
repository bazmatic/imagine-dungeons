import "reflect-metadata"
import { DataSource } from "typeorm"
import { Exit } from "./entity/Exit"
import { Item } from "./entity/Item"
import { Agent } from "./entity/Agent"
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
        Location,
        Exit,
        Item,
        Agent,
    ],
    migrations: [],
    subscribers: [],
})
