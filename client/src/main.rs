// Import necessary libraries
use reqwest::Client; // For making HTTP requests
use std::io::{self, Write}; // For input/output operations
// Import the GameEventDTO and CommandType from lib.rs
use imagind::{GameEventDTO};
use colored::*;
use reqwest::Response;
use clearscreen; 

const DEBUG: bool = true;

// Main function, marked as async and using tokio runtime
#[tokio::main]
async fn main() {
    // Create a new HTTP client
    let client = Client::new();
    // Define the API endpoint URL
    let api_url = if DEBUG {
        "http://localhost:3000/api/command"
    } else {
        "https://9b41-220-253-88-74.ngrok-free.app/api/command"
    };
    // Clear the console
    clearscreen::clear().unwrap();



    // Start the game by sending "look around"
    let res = client
        .post(api_url)
        .json(&serde_json::json!({ "agentId": "char_39322", "command": "look around" }))
        .send()
        .await;

    match res {
        Ok(response) => handle_api_response(response).await,
        Err(e) => {
            println!("Error sending command: {}", e);
        }
    }

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
            Ok(response) => handle_api_response(response).await,
            Err(e) => {
                println!("Error sending command: {}", e);
            }
        }
    }
}

async fn handle_api_response(response: Response) {
    if response.status().is_success() {
        match response.json::<Vec<GameEventDTO>>().await {
            Ok(game_events) => {
                for game_event in game_events {
                    // if DEBUG {
                    //     print_debug_info(&game_event);
                    // }
                    print_colored_event(&game_event);
                }
            },
            Err(e) => {
                println!("Error parsing JSON: {}", e);
            }
        }
    } else {
        println!(
            "Error: Received status code {}",
            response.status().as_u16()
        );
    }
}

fn print_colored_event(game_event: &GameEventDTO) {
    println!("{}: {}", game_event.agent_name.color("bright blue"), game_event.general_description.color("bright black"));

    // Display the extra text as yellow
    if let Some(extra_detail) = &game_event.extra_detail {
        for line in extra_detail {
            println!("{}", line.color("yellow"));
        }
    }
}
