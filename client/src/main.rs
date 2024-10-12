// Import necessary libraries
use reqwest::Client; // For making HTTP requests
use std::io::{self, Write}; // For input/output operations
// Import the GameEventDTO and CommandType from lib.rs
use imagind::{GameEventDTO, CommandType};
use colored::*;


const DEBUG: bool = false;

// Main function, marked as async and using tokio runtime
#[tokio::main]
async fn main() {
    // Create a new HTTP client
    let client = Client::new();
    // Define the API endpoint URL
    let api_url = "http://localhost:3000/api/command";

    // Start an infinite loop for the game
    loop {
        // Prompt the user for input
        print!("> ");
        // Ensure the prompt is immediately displayed
        io::stdout().flush().unwrap();

        // Read user input
        let mut raw_command: String = String::new(); // New empty string object with 0 length
        io::stdin().read_line(&mut raw_command).expect("Failed to read line"); // Put the input into the raw_command string
        let command: String = raw_command.trim().to_lowercase(); // Create new string object with the trimmed input

        // Check if the user wants to exit
        if command.eq("exit") {
            println!("Bye!");
            break; // Exit the loop
        }

        // Send the command to the NextJS API
        let res = client
            .post(api_url) // POST request to the API URL
            .json(&serde_json::json!({ "agentId": "char_39322", "command": command })) // JSON payload
            .send() // Send the request
            .await; // Wait for the response (async)

        // Handle the API response
        match res {
            Ok(response) => {
                if response.status().is_success() {
                    match response.json::<Vec<GameEventDTO>>().await {
                        Ok(game_events) => {
                            for game_event in game_events {
                                if DEBUG {
                                    print_debug_info(&game_event);
                                }
                                print_colored_event(&game_event);
                            }
                        },
                        Err(e) => {
                            println!("Error parsing JSON: {}", e);
                        }
                    }
                } else {
                    // If the request was not successful, print the error status code
                    println!(
                        "Error: Received status code {}",
                        response.status().as_u16()
                    );
                }
            }
            Err(e) => {
                // If there was an error sending the request, print the error
                println!("Error sending command: {}", e);
            }
        }
    }
}

fn print_debug_info(game_event: &GameEventDTO) {
    println!("Agent ID: {}", game_event.agent_id);
    if let Some(input_text) = &game_event.input_text {
        println!("Input Text: {}", input_text);
    }
    println!("Command Type: {:?}", game_event.command_type);
    println!("Command Arguments: {:?}", game_event.command_arguments);
}

fn print_colored_event(game_event: &GameEventDTO) {
    let color = match game_event.command_type {
        CommandType::LookAround | CommandType::LookAtAgent | CommandType::LookAtExit | CommandType::LookAtItem => "cyan",
        CommandType::AttackAgent => "red",
        CommandType::DropItem | CommandType::PickUpItem | CommandType::GiveItemToAgent => "yellow",
        CommandType::Emote | CommandType::SpeakToAgent => "green",
        CommandType::GetInventory => "magenta",
        CommandType::GoExit => "blue",
        CommandType::UpdateAgentIntent | CommandType::UpdateAgentMood => "bright black",
        CommandType::Wait => "white",
        _ => "white",
    };

    for line in &game_event.description {
        println!("  {}", line.color(color));
    }
}
