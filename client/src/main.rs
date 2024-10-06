// Import necessary libraries
use reqwest::Client; // For making HTTP requests
use std::io::{self, Write}; // For input/output operations
use serde_json::Value; // For deserializing JSON responses
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
            .json(&serde_json::json!({ "agentId": "char_paff", "command": command })) // JSON payload
            .send() // Send the request
            .await; // Wait for the response (async)

        // Handle the API response
        match res {
            Ok(response) => {
                if response.status().is_success() {
                    // If the request was successful, parse the JSON response using serde_json::from_str
                    // Get the response text
                    let response_text = response.text().await.unwrap();
                    println!("{}", response_text);          
        
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
