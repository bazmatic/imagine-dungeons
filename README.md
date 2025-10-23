# Imagine Dungeons - AI-Powered Text Adventure Game

A sophisticated text-based adventure game system featuring AI-powered autonomous agents, built with Next.js, TypeScript, TypeORM, and PostgreSQL. The game simulates a fantasy world where both human players and AI-controlled NPCs can interact, explore, and engage in complex narratives.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Core Components](#core-components)
- [Data Models](#data-models)
- [Services](#services)
- [API **Endpoints**](#api-endpoints)
- [AI Integration](#ai-integration)
- [Game Flow](#game-flow)
- [Setup Instructions](#setup-instructions)
- [Development Guide](#development-guide)
- [Client Application](#client-application)

## Overview

Imagine Dungeons is a prototype for an AI-powered text adventure game system. The game features:

- **Autonomous AI Agents**: NPCs that can think, act, and respond using AI
- **Dynamic World**: Locations, items, and exits that can change based on events
- **Complex Narratives**: AI-driven story progression and consequences
- **Multi-Agent Interactions**: Agents can speak, fight, trade, and collaborate
- **Real-time Game Events**: Actions trigger cascading effects and autonomous responses

### Current Scenario: "The Burning District"

The game is set in a fantasy world where a magical catastrophe has created the "Burning District" - an area perpetually consumed by magical flames. Players take on the role of Paff Pinkerton, a young adventurer seeking to uncover the truth and stop the eternal fire.

## Architecture

The system follows a layered architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                    Client (Rust)                            │
│  - Terminal-based interface                                 │
│  - Command input/output                                     │
│  - Game state display                                       │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP API
┌─────────────────────▼───────────────────────────────────────┐
│                 Next.js API Layer                           │
│  - /api/command (main game endpoint)                        │
│  - /api/agent, /api/location, /api/item (data endpoints)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Service Layer                                │
│  - Referee: Command interpretation & execution              │
│  - WorldService: Autonomous agent coordination              │
│  - AgentService, LocationService, ItemService: CRUD         │
│  - AI Services: OpenAI/Anthropic integration                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                Entity Layer (TypeORM)                       │
│  - Agent, Location, Item, Exit, GameEvent                   │
│  - Relationships and business logic                         │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Database (PostgreSQL)                          │
│  - Game state persistence                                   │
│  - Event history tracking                                   │
└─────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Game Engine (`Referee.ts`)
The central game engine that:
- Interprets natural language commands using AI
- Executes game actions (move, attack, speak, etc.)
- Manages game state transitions
- Determines consequent events after actions

### 2. Autonomous Agent System (`AgentActor.ts`)
AI-powered NPCs that:
- Make decisions based on their personality, goals, and context
- Act autonomously when activated
- Respond to events in their environment
- Maintain emotional states and intentions

### 3. World Service (`World.service.ts`)
Coordinates the game world:
- Manages autonomous agent actions
- Triggers consequent events
- Maintains game state consistency

### 4. Event System (`GameEvent.ts`)
Tracks and describes all game actions:
- Records who did what, when, and where
- Provides contextual descriptions for observers
- Maintains game history

## Data Models

### Core Entities

#### Agent
Represents characters in the game (both human players and AI NPCs):
```typescript
{
  agentId: string;
  label: string;           // Display name
  shortDescription: string;
  longDescription: string;
  ownerLocationId: string; // Current location
  capacity: number;        // Carrying capacity
  health: number;
  damage: number;
  defence: number;
  backstory: string;
  mood: string;           // Current emotional state
  currentIntent: string;  // What they're trying to do
  goal: string;          // Long-term objective
  autonomous: boolean;    // Can act independently
  activated: boolean;     // Currently active
}
```

#### Location
Game world locations with connections:
```typescript
{
  locationId: string;
  label: string;
  shortDescription: string;
  longDescription: string;
  notes: string;          // GM notes
  // Relations: items, exits, agents, creatureTemplates
}
```

#### Item
Objects that can be carried, used, or interacted with:
```typescript
{
  itemId: string;
  label: string;
  shortDescription: string;
  longDescription: string;
  ownerAgentId?: string;    // Carried by agent
  ownerLocationId?: string; // Located in location
  ownerItemId?: string;    // Inside another item
  capacity: number;        // Can hold other items
  weight: number;
  hidden: boolean;        // Not visible to players
  notes: string;
}
```

#### Exit
Connections between locations:
```typescript
{
  exitId: string;
  name: string;
  shortDescription: string;
  longDescription: string;
  ownerLocationId: string; // From location
  direction: string;       // "north", "south", etc.
  destinationId: string;  // To location
  hidden: boolean;
  locked: boolean;
}
```

#### GameEvent
Records all actions and their consequences:
```typescript
{
  game_event_id: number;
  agent_id?: string;      // Who performed the action
  location_id?: string;   // Where it happened
  input_text?: string;    // Original command
  command_type: COMMAND_TYPE;
  command_arguments: string; // JSON parameters
  output_text?: string;   // Result description
  agents_present: string[]; // Who witnessed it
  created_at: Date;
}
```

## Services

### Core Services

#### Referee Service
- **Purpose**: Central game engine and command interpreter
- **Key Methods**:
  - `acceptAgentInstructions()`: Process natural language commands
  - `executeAgentToolCall()`: Execute specific game actions
  - `determineConsequentEvents()`: AI-driven event consequences
  - `calculateTotalImpact()`: Determine if autonomous agents should act

#### World Service
- **Purpose**: Coordinate autonomous agent actions
- **Key Methods**:
  - `autonomousAgentsAct()`: Trigger all active autonomous agents

#### Agent Service
- **Purpose**: Manage agent data and state
- **Key Methods**:
  - `getAgentById()`, `getAllAgents()`
  - `updateAgentLocation()`, `updateAgentHealth()`
  - `activateAutonomy()`: Enable/disable autonomous behavior
  - `spawnAgentFromTemplate()`: Create new agents from templates

#### Location Service
- **Purpose**: Manage game world locations
- **Key Methods**:
  - `getLocationById()`, `getAllLocations()`
  - `createLocation()`, `updateLocation()`

#### Item Service
- **Purpose**: Manage game objects
- **Key Methods**:
  - `getItemById()`, `getAllItems()`
  - `setOwnerToAgent()`, `setOwnerToLocation()`
  - `revealItem()`: Make hidden items visible

#### Game Event Service
- **Purpose**: Track and manage game events
- **Key Methods**:
  - `saveGameEvent()`, `getRecentGameEvents()`
  - `makeGameEvent()`: Create new events

### AI Services

#### AI Helper Interface
```typescript
interface IAiHelper {
  interpretAgentInstructions(instructions: string, actingAgent: Agent): Promise<AiToolCall[]>;
  determineConsequentEvents(locationId: string, events: GameEvent[]): Promise<AiToolCall[]>;
  agentMakesInstructions(actingAgent: Agent): Promise<string>;
}
```

#### OpenAI Integration (`OpenAi.ts`)
- Uses GPT-4 for command interpretation
- Structured output for reliable tool calling
- Context-aware decision making

#### Anthropic Integration (`Anthropic.ts`)
- Alternative AI provider
- Claude-based agent reasoning

## API Endpoints

### Main Game Endpoint
- **POST** `/api/command`
  - **Body**: `{ agentId: string, command: string }`
  - **Response**: Array of `GameEventDTO`
  - **Purpose**: Process player commands and return game events

### Data Endpoints
- **GET** `/api/agent` - List all agents
- **GET** `/api/agent/[id]` - Get specific agent
- **GET** `/api/location` - List all locations  
- **GET** `/api/location/[id]` - Get specific location
- **GET** `/api/item` - List all items
- **GET** `/api/item/[id]` - Get specific item

## AI Integration

### Command Interpretation
1. Player inputs natural language command
2. AI analyzes context (location, inventory, other agents)
3. AI determines appropriate game actions
4. Actions are executed and results returned

### Autonomous Agent Behavior
1. AI agents receive context about their situation
2. AI decides what action to take based on personality/goals
3. Actions are executed through the same system as player commands
4. Results are integrated into the game world

### Consequent Events
1. After actions occur, AI analyzes the impact
2. AI determines what should happen next (reveal items, spawn creatures, etc.)
3. System events are triggered automatically

## Game Flow

### 1. Command Processing
```
Player Input → AI Interpretation → Action Execution → Event Recording
```

### 2. Autonomous Agent Activation
```
Action Impact > 0 → Autonomous Agents Act → Consequent Events → World Update
```

### 3. Event Description
```
Game Event → Context Analysis → Observer-Specific Description → Client Display
```

## Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Docker (optional, for database)

### Database Setup
1. **Using Docker (Recommended)**:
   ```bash
   docker build -t imagine_dungeons_db .
   docker run -d --name imagine_dungeons -p 5432:5432 imagine_dungeons_db
   ```

2. **Manual Setup**:
   - Create PostgreSQL database: `imagine_dungeons`
   - User: `baz`, Password: `baz`
   - Run `init.sql` to create tables and seed data

### Server Setup
```bash
npm install
npm run start
```

### Client Setup
```bash
cd client
cargo build
cargo run
```

### Environment Variables
Create `.env.local`:
```
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key  # Optional
```

## Development Guide

### Adding New Commands
1. Define command in `src/types/commands.ts`
2. Add implementation in `Referee.executeAgentToolCall()`
3. Add description logic in `GameEvent.describe()`
4. Update AI prompts if needed

### Creating New Agents
1. Add agent data to `init.sql`
2. Set `autonomous: true` for AI agents
3. Define personality traits (mood, intent, goal, backstory)

### Adding New Locations
1. Create location in `init.sql`
2. Add exits to connect locations
3. Place items and set creature spawn chances

### AI Prompt Customization
- Modify prompts in `src/services/Prompts.ts`
- Adjust AI behavior in `src/services/Ai/`
- Test with different AI models

## Client Application

The Rust client (`client/`) provides:
- Terminal-based interface
- Command input and response display
- Game state visualization
- HTTP communication with the server

### Key Features
- Colored output for better readability
- Automatic screen clearing
- Error handling and retry logic
- Real-time game updates

### Usage
```bash
cd client
cargo run
# Game starts with "look around" command
# Type commands like "go north", "attack goblin", "speak to merchant"
```

## Game Commands

### Movement
- `go [direction]` - Move through exits
- `look around` - Describe current location
- `look at [item/agent/exit]` - Examine objects

### Interaction
- `speak to [agent]` - Talk to other characters
- `attack [agent]` - Combat actions
- `give [item] to [agent]` - Trade items

### Inventory
- `pick up [item]` - Take items
- `drop [item]` - Leave items
- `get inventory` - List carried items
- `search [item/location]` - Find hidden items

### AI Agent Actions
Autonomous agents can:
- Move between locations
- Pick up and drop items
- Speak to other agents
- Attack threats
- Update their mood and intentions
- React to events

## Technical Notes

### Performance Considerations
- Database connections are pooled
- Lazy loading for entity relationships
- AI calls are rate-limited
- Event history is paginated

### Scalability
- Stateless API design
- Database-backed persistence
- Horizontal scaling possible with load balancer
- AI service abstraction allows provider switching

### Security
- Input validation on all endpoints
- SQL injection prevention via TypeORM
- Rate limiting on AI calls
- Environment variable protection

## Future Enhancements

### Planned Features
- [ ] Web-based client interface
- [ ] Real-time multiplayer support
- [ ] Advanced AI personality systems
- [ ] Procedural world generation
- [ ] Save/load game states
- [ ] Mod support and plugin system

### Technical Improvements
- [ ] Redis caching for performance
- [ ] WebSocket support for real-time updates
- [ ] Advanced AI model integration
- [ ] Automated testing suite
- [ ] Performance monitoring

## Contributing

This is a prototype system designed for experimentation and learning. The codebase demonstrates:
- AI integration patterns
- Game engine architecture
- Database design for game state
- Real-time event processing
- Multi-agent systems

Feel free to explore, modify, and extend the system for your own projects!