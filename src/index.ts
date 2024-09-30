import { AppDataSource } from "./data-source"

let initialized = false

export async function initialiseDatabase() {
  if (!initialized) {
    try {
      await AppDataSource.initialize()
      console.log("Data Source has been initialised!")
      initialized = true
    } catch (err) {
      console.error("Error during Data Source initialisation", err)
      throw err
    }
  }
}