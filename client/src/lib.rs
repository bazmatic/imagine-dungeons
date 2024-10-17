use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use serde_json::Value;
// Make a DTO for the GameEvent
#[derive(Debug, Serialize, Deserialize)]
pub struct GameEventDTO {
    pub agent_id: String,
    pub agent_name: String,
    pub command_type: CommandType,
    pub command_arguments: HashMap<String, Value>,
    pub general_description: String,
    pub extra_detail: Option<Vec<String>>,
}

// Make an enum for the COMMAND_TYPE    
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum CommandType {
    AttackAgent,
    DoNothing,
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
    RevealExit,
    RevealItem,
    SearchLocation,
    SpeakToAgent,
    UnlockExit,
    UpdateAgentIntent,
    UpdateAgentMood,
    UpdateItemDescription,
    Wait,
}
