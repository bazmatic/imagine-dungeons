-- init.sql for The Burning District Adventure
DROP TABLE IF EXISTS exit;
DROP TABLE IF EXISTS item;
DROP TABLE IF EXISTS agent;
DROP TABLE IF EXISTS location;

CREATE TABLE IF NOT EXISTS location (
    location_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id TEXT
);

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
    autonomous BOOLEAN NOT NULL DEFAULT TRUE, -- if true, the agent can act autonomously
    activated BOOLEAN DEFAULT FALSE, -- if true, and the autonomous flag is true, the agent will act autonomously
    FOREIGN KEY (owner_location_id) REFERENCES location(location_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS agent_message (
    message_id SERIAL PRIMARY KEY,
    sender_agent_id TEXT,
    receiver_agent_id TEXT,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_agent_id) REFERENCES agent(agent_id) ON DELETE SET NULL,
    FOREIGN KEY (receiver_agent_id) REFERENCES agent(agent_id) ON DELETE SET NULL
);

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

CREATE TABLE IF NOT EXISTS exit (
    exit_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_location_id TEXT,
    direction TEXT NOT NULL,
    destination_id TEXT NOT NULL,
    hidden BOOLEAN NOT NULL DEFAULT TRUE,
    FOREIGN KEY (owner_location_id) REFERENCES location(location_id) ON DELETE SET NULL,
    FOREIGN KEY (destination_id) REFERENCES location(location_id) ON DELETE CASCADE
);

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

INSERT INTO location (location_id, name, short_description, long_description) VALUES
    ('loc_flaming_goblet', 'The Flaming Goblet', 'A tavern on the edge of the Burning District', 'A tavern with one wall constantly aflame, mostly staffed by Tieflings. The heat inside is intense.'),
    ('loc_burning_street', 'Burning Street', 'A street engulfed in perpetual flames', 'Once a bustling street, now consumed by magical fire that cannot be extinguished.'),
    ('loc_fire_salvagers', 'Fire Salvagers'' Camp', 'A makeshift camp of scavengers', 'A settlement of survivors who have adapted to life in the Burning District, trading in salvaged goods.'),
    ('loc_zezrans_house', 'Zezran''s House', 'A partially burned wizard''s house', 'The former residence of the wizard Zezran, now a dangerous ruin with flames licking at its walls.'),
    ('loc_workshop', 'Zezran''s Workshop', 'A cluttered magical workshop', 'The heart of Zezran''s experiments, filled with arcane equipment and magical artifacts.'),
    ('loc_inferno_alley', 'Inferno Alley', 'A narrow alley of intense heat', 'A tight passage where the flames burn hottest, challenging even the most fire-resistant adventurers.'),
    ('loc_elemental_plaza', 'Elemental Plaza', 'A wide open area with a fire elemental', 'A former city square now dominated by a massive fire elemental, believed to be the mother of the trapped elementals.'),
    ('loc_ember_avenue', 'Ember Avenue', 'A wide street with floating embers', 'A broad avenue where glowing embers float through the air like fireflies, creating a beautiful yet dangerous spectacle.'),
    ('loc_ash_lane', 'Ash Lane', 'A street covered in deep ash', 'A narrow lane where ash has accumulated to knee-depth, making movement difficult and hiding potential dangers.'),
    ('loc_phoenix_row', 'Phoenix Row', 'A street of colorful, flickering flames', 'A street where flames dance in vibrant colors reminiscent of a phoenix''s plumage, constantly dying and being reborn.'),
    ('loc_smoldering_square', 'Smoldering Square', 'A open area with smoldering ruins', 'A once-bustling marketplace, now a large square filled with the smoldering remains of stalls and buildings.'),
    ('loc_dockside_markets', 'Dockside Markets', 'A bustling marketplace near the docks', 'A lively area where traders and sailors mingle, selling goods from distant lands. The smell of salt and spices fills the air.'),
    ('loc_docks', 'The Docks', 'A series of wooden piers extending into the water', 'Wooden piers stretch out into the water, where ships of various sizes are moored. The air is thick with the smell of the sea and the sound of creaking wood.'),
    ('loc_serenas_ship', 'The Serpent', 'Captain Serena''s impressive ship', 'A sleek vessel with intricate carvings of serpents along its hull. It''s currently undergoing repairs, but still looks formidable.');


-- Update Captain Serena's location to her ship
UPDATE agent SET owner_location_id = 'loc_serenas_ship' WHERE agent_id = 'char_84751';


INSERT INTO agent (agent_id, name, short_description, long_description, owner_location_id, capacity, backstory, mood, current_intent, goal, health, damage, defence, autonomous) VALUES
    ('char_39322', 'Paff Pinkerton', 'A determined young adventurer', 'Paff is a youth with a fierce determination in his eyes, seeking to uncover the truth about the Burning District.', 'loc_flaming_goblet', 30, 'Nephew of the wizard Bob, Paff believes his uncle was involved in creating the Burning District and seeks to stop the eternal fire.', 'Determined', 'Find adventurers to help explore the district', 'Discover the truth about the Phoenix Heart', 20, 2, 12, TRUE),
    ('char_84751', 'Captain Serena', 'A seasoned sea captain', 'Captain Serena is a tall tiefling with red skin and sharp horns, wearing a coat of fish scales.', 'loc_flaming_goblet', 40, 'A veteran sailor whose ship is undergoing repairs. She has valuable information about Zezran and the elemental plane of water.', 'Cautious', 'Oversee ship repairs', 'Return to the sea', 25, 3, 14, TRUE),
    ('char_62103', 'Uncle Bob', 'A cranky old wizard', 'Bob is a cantankerous old man in a singed wizard''s robe, hiding a guilty secret.', 'loc_burning_street', 20, 'Former colleague of Zezran, Bob was involved in the creation of the Phoenix Heart and the subsequent burning of the district.', 'Anxious', 'Prevent others from discovering his secret', 'Obtain the Phoenix Heart for himself', 18, 4, 13, TRUE),
    ('char_15987', 'Elysia Everwood', 'A distressed elven woman', 'Elysia is an elf with a haunted look in her eyes, her clothes singed and tattered.', 'loc_fire_salvagers', 25, 'Last of a renowned elven family, Elysia seeks to clear her name and uncover the truth behind a magical catastrophe.', 'Desperate', 'Escape from bandits', 'Redeem herself and restore her family''s honor', 22, 2, 13, TRUE),
    ('char_70451', 'Ember', 'A mischievous fire sprite', 'A small, flickering humanoid made entirely of living flame, with a penchant for playful tricks.', 'loc_ember_avenue', 5, 'Born from the magical fires of the district, Ember enjoys confusing and misdirecting travelers.', 'Playful', 'Play tricks on passersby', 'Spread chaos and laughter', 15, 2, 16, TRUE),
    ('char_28934', 'Ashen', 'A somber ash elemental', 'A humanoid figure made of tightly packed ash, with glowing embers for eyes.', 'loc_ash_lane', 50, 'Formed from the ashes of the district, Ashen mourns the loss of the old city and seeks to preserve its memories.', 'Melancholy', 'Collect remnants of the old city', 'Preserve the history of the district', 35, 4, 15, TRUE),
    ('char_53679', 'Flicker', 'A nervous flame dancer', 'A lithe human with hair that constantly shifts between various shades of red and orange.', 'loc_phoenix_row', 15, 'A performer who developed unique fire manipulation abilities after the district''s transformation.', 'Anxious', 'Perfect fire dancing techniques', 'Find a way to control the district''s flames', 20, 2, 14, TRUE),
    ('char_91245', 'Cinder', 'A gruff fire salvager', 'A stocky dwarf with soot-stained skin and a beard that occasionally smolders.', 'loc_smoldering_square', 40, 'Once a smith, now Cinder leads a group of salvagers who brave the flames to recover valuable items.', 'Determined', 'Organize salvaging expeditions', 'Rebuild a new community from the ashes', 28, 3, 14, TRUE),
    ('char_47802', 'Pyra', 'A mysterious pyromancer', 'A tall woman with fiery red hair and eyes that seem to flicker with inner flame.', 'loc_elemental_plaza', 25, 'A powerful pyromancer who seeks to understand and possibly control the magical fires of the district.', 'Intense', 'Study the behavior of magical flames', 'Harness the power of the Burning District', 24, 4, 15, TRUE),
    ('char_36510', 'Smolder', 'A cynical ex-firefighter', 'A muscular human with burn scars covering half his face, wearing tattered firefighter gear.', 'loc_burning_street', 35, 'Once dedicated to fighting fires, Smolder now believes the district is beyond saving and warns others to leave.', 'Pessimistic', 'Discourage newcomers from staying', 'Find a way to escape the Burning District', 26, 3, 13, TRUE),
    ('char_82367', 'Ash Pup', 'A playful ash dog', 'A small dog-like creature made of ash and embers, leaving a trail of soot wherever it goes.', 'loc_ash_lane', 10, 'Born from the ashes of the district, this creature has become Ashen''s loyal companion.', 'Curious', 'Explore and play in the ash', 'Find interesting objects buried in the ash', 12, 1, 15, TRUE),
    ('char_59731', 'Inferna', 'The fire elemental matriarch', 'A massive, majestic fire elemental with a form that vaguely resembles a female humanoid.', 'loc_elemental_plaza', 100, 'The mother of the trapped fire elementals, she guards the district and seeks to free her children.', 'Protective', 'Guard the Phoenix Heart', 'Free her children from the Phoenix Heart', 60, 6, 18, TRUE),
    ('char_13498', 'Spark', 'An energetic messenger', 'A young halfling with hair that stands on end, crackling with static electricity.', 'loc_flaming_goblet', 15, 'A swift runner who delivers messages and small packages throughout the Burning District.', 'Energetic', 'Deliver messages quickly', 'Map out all the safe routes in the district', 18, 2, 14, TRUE),
    ('char_75024', 'Cinder Golem', 'A lumbering ash construct', 'A large, humanoid figure made of compressed ash and burning embers.', 'loc_smoldering_square', 80, 'Created by Cinder to assist with heavy lifting and protection during salvage operations.', 'Stoic', 'Follow Cinder''s commands', 'Protect the fire salvagers', 45, 5, 16, TRUE),
    ('char_20876', 'Flamebeak', 'A fiery phoenix', 'A magnificent bird with feathers of dancing flames and eyes like glowing coals.', 'loc_phoenix_row', 20, 'A magical creature that has made its home in the Burning District, symbolizing hope and renewal.', 'Majestic', 'Soar above the burning streets', 'Inspire hope in the district''s inhabitants', 30, 3, 17, TRUE),
    ('char_fs001', 'Fire Slater Alpha', 'A fiery, insect-like creature', 'A small, isopod-like creature with a glowing red carapace that radiates heat.', 'loc_burning_street', 5, 'Native to the Elemental Plane of Fire, now inhabiting the Burning District.', 'Neutral', 'Scavenge for food', 'Survive in the Burning District', 10, 2, 15, TRUE),
    ('char_fs002', 'Fire Slater Beta', 'A heat-emitting elemental bug', 'An agile, fiery creature that can squeeze through narrow spaces.', 'loc_ash_lane', 5, 'Adapted to extreme temperatures, thriving in the ashes of the district.', 'Cautious', 'Explore ash piles', 'Find suitable nesting area', 10, 2, 15, TRUE),
    ('char_fs003', 'Fire Slater Gamma', 'A swift, flame-colored isopod', 'A small elemental creature with sharp mandibles and a defensive heat burst ability.', 'loc_ember_avenue', 5, 'Scuttled through a planar rift during the district''s transformation.', 'Defensive', 'Guard territory', 'Establish a colony', 10, 2, 15, TRUE),
    ('char_fs004', 'Fire Slater Delta', 'A nimble fire elemental bug', 'An insect-like being of living flame, capable of releasing bursts of heat.', 'loc_inferno_alley', 5, 'Drawn to the intense heat of Inferno Alley.', 'Aggressive', 'Patrol for intruders', 'Protect fire elemental interests', 10, 2, 15, TRUE),
    ('char_fs005', 'Fire Slater Epsilon', 'A heat-radiating elemental creature', 'A small, fiery isopod with the ability to move through extremely tight spaces.', 'loc_smoldering_square', 5, 'Thrives in the smoldering ruins, feeding on charred debris.', 'Curious', 'Investigate new scents', 'Expand territory', 10, 2, 15, TRUE);

UPDATE agent SET autonomous = FALSE WHERE agent_id = 'char_39322';

INSERT INTO item (item_id, name, short_description, long_description, owner_agent_id, owner_location_id, owner_item_id, weight, capacity, notes) VALUES
    ('item_phoenix_heart', 'The Phoenix Heart', 'A pulsating gemstone', 'A large gem that pulses with fiery energy, said to be the source of the district''s eternal flames.', NULL, 'loc_workshop', NULL, 5, 0, 'Can be unlocked by the Rusty Key (item_rusty_key). Pyra (char_47802) desperately wants this item.'),
    ('item_fire_extinguisher', 'Magical Fire Extinguisher', 'A device that temporarily stops fires', 'A curious contraption that can temporarily extinguish magical fires in a small area.', 'char_39322', NULL, NULL, 3, 0, 'Uncle Bob (char_62103) is terrified of this item and will flee if he sees it.'),
    ('item_heat_cloak', 'Heat-Resistant Cloak', 'A cloak that protects from extreme heat', 'A shimmering cloak that provides protection against the intense heat of the Burning District.', NULL, 'loc_fire_salvagers', NULL, 2, 0, NULL),
    ('item_zezrans_journal', 'Zezran''s Journal', 'A partially burned book', 'A journal detailing Zezran''s experiments with fire elementals and the creation of the Phoenix Heart.', NULL, 'loc_zezrans_house', NULL, 1, 0, 'Contains crucial information about the Phoenix Heart''s creation and potential weaknesses.'),
    ('item_elemental_jar', 'Elemental Containment Jar', 'A strange metal sphere', 'A reinforced jar designed to capture and contain elemental beings.', NULL, 'loc_workshop', NULL, 4, 0, 'Can be used to capture Ember (char_70451) or other small fire elementals.'),
    ('item_frostfire_bomb', 'Frostfire Bomb', 'A volatile magical explosive', 'A bomb that explodes into freezing flames, effective against fire elementals.', NULL, 'loc_fire_salvagers', NULL, 1, 0, 'Extremely effective against Inferna (char_59731) but may cause collateral damage.'),
    ('item_ember_whistle', 'Ember Whistle', 'A whistle that controls small flames', 'A small whistle made of glowing hot metal that can command nearby embers and small flames.', 'char_70451', NULL, NULL, 1, 0, 'Can be used to communicate with and potentially control fire elementals.'),
    ('item_ashen_chronicle', 'Ashen Chronicle', 'A book that records memories', 'A tome made of compressed ash that magically records the memories of those who touch it.', 'char_28934', NULL, NULL, 2, 0, 'Contains valuable historical information about the Burning District before the catastrophe.'),
    ('item_phoenix_feather', 'Phoenix Feather', 'A magical feather of shifting colors', 'A feather that constantly shifts through various flame-like colors and is warm to the touch.', NULL, 'loc_phoenix_row', NULL, 1, 0, 'Inferna (char_59731) is drawn to this item and will attempt to acquire it if nearby.'),
    ('item_flame_tongs', 'Flame Tongs', 'Tongs for handling hot objects', 'A pair of tongs that can safely grasp extremely hot or burning objects without transferring heat to the user.', 'char_91245', NULL, NULL, 3, 0, 'Can be used to safely handle the Phoenix Heart without being burned.'),
    ('item_fire_map', 'Fire Map', 'A map of the ever-changing flames', 'A magical map that updates in real-time, showing the current locations and intensities of fires in the district.', NULL, 'loc_flaming_goblet', NULL, 1, 0, 'Essential for navigating the constantly changing landscape of the Burning District.'),
    ('item_cinder_coins', 'Cinder Coins', 'Glowing hot coins', 'Currency used in the Burning District, these coins are always hot to the touch and glow like embers.', NULL, 'loc_smoldering_square', NULL, 1, 0, 'Can be used to bribe or trade with inhabitants of the Burning District.');

INSERT INTO item (item_id, name, short_description, long_description, owner_location_id, weight, capacity, hidden, notes) VALUES
    ('item_rusty_key', 'Rusty Key', 'A small, rusty key', 'A small, rusty key with the word "Entrance" inscribed on it.', 'loc_flaming_goblet', 1, 0, TRUE, 'Opens a hidden compartment in Zezran''s Workshop containing valuable research notes. Also unlocks the Phoenix Heart.');

INSERT INTO exit (exit_id, name, short_description, long_description, owner_location_id, direction, destination_id) VALUES
    ('exit_to_street', 'Tavern Exit', 'The door to the burning street', 'A heavy iron door leading out to the perpetually burning street.', 'loc_flaming_goblet', 'north', 'loc_burning_street'),
    ('exit_to_tavern', 'Tavern Entrance', 'The entrance to the Flaming Goblet', 'A sturdy door marked with a sign of a goblet wreathed in flames.', 'loc_burning_street', 'south', 'loc_flaming_goblet'),
    ('exit_to_camp', 'Path to Salvagers'' Camp', 'A winding path through the flames', 'A treacherous path that leads to the makeshift camp of the Fire Salvagers.', 'loc_burning_street', 'east', 'loc_fire_salvagers'),
    ('exit_to_house', 'Zezran''s House', 'The remains of a grand house', 'The charred remnants of what was once a magnificent wizard''s dwelling.', 'loc_burning_street', 'west', 'loc_zezrans_house'),
    ('exit_to_workshop', 'Hidden Passage', 'A concealed door in the floor', 'A trapdoor hidden beneath a scorched rug, leading to a secret workshop.', 'loc_zezrans_house', 'down', 'loc_workshop'),
    ('exit_to_alley', 'Narrow Alleyway', 'A tight passage between burning buildings', 'A claustrophobic alley where the flames seem to close in from all sides.', 'loc_burning_street', 'north', 'loc_inferno_alley'),
    ('exit_to_plaza', 'Wide Street', 'A broad avenue leading to a plaza', 'A once-grand street opening up to a large square, now dominated by intense fires.', 'loc_inferno_alley', 'east', 'loc_elemental_plaza'),
    ('exit_to_ember', 'Glowing Archway', 'An arch of floating embers', 'An archway formed by swirling embers, marking the entrance to Ember Avenue.', 'loc_burning_street', 'northeast', 'loc_ember_avenue'),
    ('exit_to_ash', 'Ashen Path', 'A path disappearing into deep ash', 'A narrow path leading into Ash Lane, where the ground is obscured by deep, shifting ash.', 'loc_ember_avenue', 'east', 'loc_ash_lane'),
    ('exit_to_phoenix', 'Colorful Flames', 'A street of rainbow fire', 'An entrance marked by flames of every color, beckoning visitors to Phoenix Row.', 'loc_ash_lane', 'south', 'loc_phoenix_row'),
    ('exit_to_square', 'Crumbling Archway', 'A damaged arch leading to a square', 'A partially collapsed stone arch that opens onto the vast expanse of Smoldering Square.', 'loc_phoenix_row', 'west', 'loc_smoldering_square'),
    ('exit_to_burning', 'Flame-Licked Street', 'A street back to the main burning area', 'A street that leads back to the central Burning Street, flames licking at your heels.', 'loc_smoldering_square', 'north', 'loc_burning_street'),
    ('exit_to_markets', 'Tavern Back Door', 'A door leading to the dockside markets', 'A sturdy door at the back of the tavern, leading out to the bustling dockside markets.', 'loc_flaming_goblet', 'south', 'loc_dockside_markets'),
    ('exit_to_tavern_from_markets', 'Tavern Entrance', 'The back entrance to the Flaming Goblet', 'A door leading back into the Flaming Goblet tavern.', 'loc_dockside_markets', 'north', 'loc_flaming_goblet'),
    ('exit_to_docks', 'Path to Docks', 'A path leading to the docks', 'A well-worn path leading from the markets down to the docks.', 'loc_dockside_markets', 'east', 'loc_docks'),
    ('exit_to_markets_from_docks', 'Path to Markets', 'A path leading back to the markets', 'A path leading up from the docks to the bustling dockside markets.', 'loc_docks', 'west', 'loc_dockside_markets'),
    ('exit_to_serenas_ship', 'Gangplank to The Serpent', 'A gangplank leading to Captain Serena''s ship', 'A sturdy gangplank connecting the dock to the deck of The Serpent.', 'loc_docks', 'south', 'loc_serenas_ship'),
    ('exit_to_docks_from_ship', 'Gangplank to Docks', 'A gangplank leading back to the docks', 'A gangplank connecting the ship''s deck to the wooden docks.', 'loc_serenas_ship', 'north', 'loc_docks'),
    ('exit_to_burning_from_camp', 'Camp Exit', 'Path leading back to Burning Street', 'A safe path winding back to the main burning street from the Fire Salvagers'' Camp.', 'loc_fire_salvagers', 'west', 'loc_burning_street'),
    ('exit_to_burning_from_house', 'House Entrance', 'Path leading back to Burning Street', 'An entrance that leads back to the main burning street from Zezran''s House.', 'loc_zezrans_house', 'east', 'loc_burning_street'),
    ('exit_to_house_from_workshop', 'Workshop Up', 'Staircase leading back to Zezran''s House', 'A staircase that leads back up to Zezran''s House from the Workshop.', 'loc_workshop', 'up', 'loc_zezrans_house'),
    ('exit_to_burning_from_alley', 'Alley Exit', 'Path leading back to Burning Street', 'A route that takes you back to the main burning street from Inferno Alley.', 'loc_inferno_alley', 'south', 'loc_burning_street'),
    ('exit_to_alley_from_plaza', 'Plaza Exit', 'Path leading back to Inferno Alley', 'A return path from Elemental Plaza back to Inferno Alley.', 'loc_elemental_plaza', 'west', 'loc_inferno_alley'),
    ('exit_to_burning_from_ember', 'Ember Avenue Exit', 'Path leading back to Burning Street', 'A southwest path that leads back to the main burning street from Ember Avenue.', 'loc_ember_avenue', 'southwest', 'loc_burning_street'),
    ('exit_to_ember_from_ash', 'Ash Lane Exit', 'Path leading back to Ember Avenue', 'A west path that takes you back to Ember Avenue from Ash Lane.', 'loc_ash_lane', 'west', 'loc_ember_avenue'),
    ('exit_to_ash_from_phoenix', 'Phoenix Row Exit', 'Path leading back to Ash Lane', 'A north path that leads back to Ash Lane from Phoenix Row.', 'loc_phoenix_row', 'north', 'loc_ash_lane'),
    ('exit_to_phoenix_from_square', 'Smoldering Square Exit', 'Path leading back to Phoenix Row', 'An east path that takes you back to Phoenix Row from Smoldering Square.', 'loc_smoldering_square', 'east', 'loc_phoenix_row');