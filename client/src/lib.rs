use serde::{Serialize, Deserialize};
use std::collections::HashMap;
// Make a DTO for the GameEvent
#[derive(Debug, Serialize, Deserialize)]
pub struct GameEventDTO {
    pub agent_id: String,
    pub input_text: Option<String>,
    pub command_type: CommandType,
    pub command_arguments: HashMap<String, String>,
    pub description: Vec<String>,
}

/* Example JSON:
[
    {
        "agentId": "char_39322",
        "inputText": "Look around",
        "commandType": "look_around",
        "commandArguments": "{}",
        "description": [
            "You look around.",
            "A tavern with one wall constantly aflame, mostly staffed by Tieflings. The heat inside is intense.\nTo the north: The door to the burning street\nTo the south: A door leading to the dockside markets\nCaptain Serena is here.\nSpark is here.\nThere is a Fire Map here."
        ]
    }
]
*/

// Make an enum for the COMMAND_TYPE    
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandType {
    AttackAgent,
    DropItem,
    Emote,
    GetInventory,
    GiveItemToAgent,
    GoExit,
    LookAround,
    LookAtAgent,
    LookAtExit,
    LookAtItem,
    PickUpItem,
    SpeakToAgent,
    UpdateAgentIntent,
    UpdateAgentMood,
    Wait,
}