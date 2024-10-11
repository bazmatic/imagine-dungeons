import "reflect-metadata"
import { DataSource } from "typeorm"
import { Exit } from "./entity/Exit"
import { Item } from "./entity/Item"
import { Agent } from "./entity/Agent"
import { Location } from "./entity/Location"
import { AgentMessage } from "./entity/AgentMessage"
import { GameEvent } from "./entity/GameEvent"

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "localhost",
    port: 5432,
    username: "baz",
    password: "baz",
    database: "imagine_dungeons",
    synchronize: false,
    logging: false,
    entities: [
        Location,
        Exit,
        Item,
        Agent,
        AgentMessage,
        GameEvent
    ],
    migrations: [],
    subscribers: [],
})
