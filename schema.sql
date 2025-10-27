-- schema.sql for The Burning District Adventure
-- This script creates the database schema for the AI-powered text adventure game
-- "The Burning District" - a fantasy world where magical flames consume an area

-- =============================================================================
-- DATABASE SCHEMA CREATION
-- =============================================================================

-- Drop existing tables in reverse dependency order to avoid foreign key conflicts
DROP TABLE IF EXISTS creature_template_location;
DROP TABLE IF EXISTS creature_template;
DROP TABLE IF EXISTS game_event;
DROP TABLE IF EXISTS exit;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS agent_message;
DROP TABLE IF EXISTS agent;
DROP TABLE IF EXISTS location;

-- =============================================================================
-- CORE GAME WORLD TABLES
-- =============================================================================

-- LOCATION TABLE
-- Represents places in the game world where agents can be and events can occur
-- Each location has descriptions for players and internal notes for the game master
CREATE TABLE IF NOT EXISTS location (
    location_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    notes TEXT,
    owner_id TEXT
);

-- AGENT TABLE
-- Represents characters in the game (both human players and AI-controlled NPCs)
-- Contains personality traits, stats, and behavioral flags for autonomous AI agents
CREATE TABLE IF NOT EXISTS agent (
    agent_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_location_id TEXT,
    capacity INTEGER NOT NULL,
    health INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    defence INTEGER NOT NULL,
    backstory TEXT NOT NULL,
    mood TEXT NULL,
    current_intent TEXT NULL,
    goal TEXT NULL,
    notes TEXT NULL,
    autonomous BOOLEAN NOT NULL DEFAULT TRUE, -- if true, the agent can act autonomously
    activated BOOLEAN DEFAULT FALSE, -- if true, and the autonomous flag is true, the agent will act autonomously
    FOREIGN KEY (owner_location_id) REFERENCES location(location_id) ON DELETE SET NULL
);

-- AGENT MESSAGE TABLE
-- Stores communication between agents (NPCs talking to each other or players)
-- Used for dialogue, announcements, and inter-agent communication
CREATE TABLE IF NOT EXISTS agent_message (
    message_id SERIAL PRIMARY KEY,
    sender_agent_id TEXT,
    receiver_agent_id TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_agent_id) REFERENCES agent(agent_id) ON DELETE SET NULL,
    FOREIGN KEY (receiver_agent_id) REFERENCES agent(agent_id) ON DELETE SET NULL
);

-- ITEM TABLE
-- Represents objects in the game world that can be carried, used, or interacted with
-- Items can be owned by agents, located in locations, or contained within other items
CREATE TABLE IF NOT EXISTS item (
    item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_agent_id TEXT,
    owner_location_id TEXT,
    owner_item_id TEXT,
    weight INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (owner_agent_id) REFERENCES agent(agent_id) ON DELETE SET NULL,
    FOREIGN KEY (owner_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (owner_item_id) REFERENCES item(item_id) ON DELETE CASCADE
);

-- EXIT TABLE
-- Represents connections between locations (doors, passages, paths)
-- Defines the navigation structure of the game world
CREATE TABLE IF NOT EXISTS exit (
    exit_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_location_id TEXT,
    direction TEXT NOT NULL,
    destination_id TEXT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    locked BOOLEAN NOT NULL DEFAULT FALSE,
    notes TEXT,
    FOREIGN KEY (owner_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (destination_id) REFERENCES location(location_id) ON DELETE CASCADE
);

-- =============================================================================
-- GAME LOGIC AND EVENT TRACKING TABLES
-- =============================================================================

-- GAME EVENT TABLE
-- Records all actions and events that occur in the game world
-- Used for AI decision-making, game history, and triggering consequent events
CREATE TABLE IF NOT EXISTS game_event (
    game_event_id SERIAL PRIMARY KEY,
    agent_id TEXT NOT NULL, -- The ID of the agent that issued the command
    input_text TEXT NULL, -- The input text that the agent provided, if any
    command_type TEXT NOT NULL, -- The type of command that was issued
    command_arguments JSONB NOT NULL, -- The arguments for the command
    location_id TEXT NULL, -- The ID of the location that the command was issued in
    output_text TEXT NULL, -- Text output by running the command
    agents_present JSONB NULL, -- JSONB array of agents present in the same location as the command was issued
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (agent_id) REFERENCES agent(agent_id) ON DELETE CASCADE
);

-- =============================================================================
-- DYNAMIC CONTENT AND SPAWNING TABLES
-- =============================================================================

-- CREATURE TEMPLATE TABLE
-- Defines templates for creatures that can be spawned dynamically in the game
-- Used for creating enemies, NPCs, and other dynamic characters based on location
CREATE TABLE IF NOT EXISTS creature_template (
    template_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    capacity INTEGER NOT NULL,
    health INTEGER NOT NULL,
    damage INTEGER NOT NULL,
    defence INTEGER NOT NULL,
    backstory TEXT NOT NULL,
    mood TEXT NULL,
    current_intent TEXT NULL,
    goal TEXT NULL,
    notes TEXT NULL,
    autonomous BOOLEAN NOT NULL DEFAULT TRUE
);

-- CREATURE TEMPLATE LOCATION TABLE
-- Links creature templates to locations with spawn probabilities
-- This table is created after all referenced tables exist to avoid foreign key issues
CREATE TABLE IF NOT EXISTS creature_template_location (
    template_id TEXT,
    location_id TEXT,
    spawn_chance FLOAT NOT NULL DEFAULT 0.5,
    PRIMARY KEY (template_id, location_id),
    FOREIGN KEY (template_id) REFERENCES creature_template(template_id) ON DELETE CASCADE,
    FOREIGN KEY (location_id) REFERENCES location(location_id) ON DELETE CASCADE
);
