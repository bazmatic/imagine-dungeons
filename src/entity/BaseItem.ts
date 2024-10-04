export enum GameObjectKind {
    ITEM = "item",
    LOCATION = "location",
    EXIT = "exit",
    AGENT = "agent"
}

export interface IBaseProperties {
    name: string;
    shortDescription: string;
    longDescription: string;
}