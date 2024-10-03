CREATE TABLE IF NOT EXISTS item (
    item_id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id TEXT,
    weight INTEGER NOT NULL,
    capacity INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS location (
    location_id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id TEXT
);

CREATE TABLE IF NOT EXISTS exit (
    exit_id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id TEXT,
    direction TEXT NOT NULL,
    destination_id TEXT NOT NULL,
    FOREIGN KEY (destination_id) REFERENCES location(location_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS agent (
    agent_id TEXT PRIMARY KEY,
	name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id TEXT,
    capacity INTEGER NOT NULL,
    backstory TEXT NOT NULL,
    mood TEXT NULL,
    current_intent TEXT NULL,
    goal TEXT NULL
);

-- Insert Locations
INSERT INTO location (location_id, name, short_description, long_description) VALUES
    ('loc_forest_clearing', 'Forest Clearing', 'A peaceful forest clearing', 'A serene clearing in the heart of the forest, dappled with sunlight.'),
    ('loc_forest_path', 'Forest Path', 'A winding path through the forest', 'A narrow path weaving between ancient trees, their branches forming a canopy overhead.'),
    ('loc_winding_path', 'Winding Forest Path', 'A twisting path deeper in the forest', 'The path becomes more convoluted, with roots and undergrowth making progress difficult.'),
    ('loc_forest_edge', 'Edge of Forest', 'The border between forest and open land', 'The dense forest gradually gives way to open land. A cave entrance is visible nearby.'),
    ('loc_cave', 'Cave', 'A dark, mysterious cave', 'The mouth of a cave yawns before you, promising secrets within its shadowy depths.'),
    ('loc_rocky_passage', 'Rocky Passage', 'A narrow, rocky corridor', 'A tight passage hewn from solid rock, leading deeper into the earth.'),
    ('loc_wizard_lab', 'Wizard''s Lab', 'A room filled with arcane equipment', 'Bubbling potions, glowing crystals, and ancient tomes fill this mystical workshop.');

-- Insert Exits
INSERT INTO exit (exit_id, name, short_description, long_description, owner_id, direction, destination_id) VALUES
    ('exit_to_clearing', 'Path to Clearing', 'A path leading to a clearing', 'A well-trodden path leading towards a brighter area of the forest.', 'loc_forest_path', 'north', 'loc_forest_clearing'),
    ('exit_to_forest', 'Path to Forest', 'A path leading deeper into the forest', 'A narrow trail disappearing into the shadowy forest.', 'loc_forest_clearing', 'south', 'loc_forest_path'),
    ('exit_to_winding', 'Winding Path', 'A twisting path', 'The path ahead becomes more convoluted, winding between ancient trees.', 'loc_forest_path', 'east', 'loc_winding_path'),
    ('exit_to_edge', 'Forest Edge', 'The edge of the forest', 'The forest begins to thin out, revealing open land beyond.', 'loc_winding_path', 'west', 'loc_forest_edge'),
    ('exit_to_cave', 'Cave Entrance', 'The mouth of a cave', 'A dark opening in the rocky hillside, leading underground.', 'loc_forest_edge', 'north', 'loc_cave'),
    ('exit_to_rocky', 'Rocky Corridor', 'A narrow passage', 'A tight corridor carved from the living rock, leading deeper into the cave system.', 'loc_cave', 'east', 'loc_rocky_passage'),
    ('exit_to_lab', 'Lab Entrance', 'A heavy wooden door', 'An ornate door marked with mystical symbols, likely leading to a wizard''s sanctuary.', 'loc_rocky_passage', 'north', 'loc_wizard_lab');

-- Insert Agents
INSERT INTO agent (agent_id, name, short_description, long_description, owner_id, capacity, backstory, mood, current_intent, goal) VALUES
    ('char_max', 'Max', 'A sly-looking rogue', 'Max has a mischievous glint in his eye and moves with cat-like grace.', 'loc_forest_clearing', 30, 'A skilled thief with a heart of gold, Max turned to adventuring to pay off old debts.', NULL, NULL, NULL),
    ('char_vincent', 'Vincent', 'A wizened old wizard', 'Vincent''s long white beard and star-speckled robes mark him as a powerful mage.', 'loc_wizard_lab', 20, 'Once a court wizard, Vincent now seeks ancient magical artifacts to restore his reputation.', NULL, NULL, NULL);

-- Insert Items
INSERT INTO item (item_id, name, short_description, long_description, owner_id, weight, capacity) VALUES
    ('item_backpack', 'Backpack', 'A sturdy leather backpack', 'A well-made backpack with multiple pockets, perfect for an adventurer.', 'char_max', 5, 50),
    ('item_stick', 'Stick', 'A simple wooden stick', 'A sturdy stick, about arm''s length. Could be useful.', 'loc_forest_clearing', 2, 0),
    ('item_pinecone', 'Pinecone', 'A brown pinecone', 'A dry pinecone, fallen from one of the towering pines.', 'loc_forest_clearing', 1, 0),
    ('item_apple_core', 'Apple Core', 'The remains of an apple', 'The core of an apple, browning with age. Someone''s leftover snack?', 'item_backpack', 1, 0),
    ('item_stone', 'Interesting Stone', 'A peculiar-looking stone', 'A smooth stone with unusual patterns. It seems to catch the light in an odd way.', 'loc_forest_edge', 3, 0),
    ('item_rusty_knife', 'Rusty Knife', 'An old, rusted knife', 'Once sharp, this knife has seen better days. The blade is rusted but might still be useful.', 'loc_cave', 2, 0),
    ('item_magic_wand', 'Magic Wand', 'A slender wooden wand', 'A finely crafted wand humming with magical energy.', 'loc_wizard_lab', 1, 0);