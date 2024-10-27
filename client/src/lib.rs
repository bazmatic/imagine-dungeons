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
    DisplayHelpText,
    DoNothing,
    DropItem,
    Emote,
    Event,
    GetInventory,
    GetItemFromItem,
    GiveItemToAgent,
    GoExit,
    LookAround,
    LookAtAgent,
    LookAtExit,
    LookAtItem,
    PickUpItem,
    RevealExit,
    RevealItem,
    SearchItem,
    SearchLocation,
    SpawnAgent,
    SpeakToAgent,
    UnlockExit,
    UpdateAgentIntent,
    UpdateAgentMood,
    UpdateItemDescription,
    UseItem,
    Wait,
}
