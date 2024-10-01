CREATE TYPE game_object_kind AS ENUM ('item', 'location', 'exit', 'character');

CREATE TABLE IF NOT EXISTS base_item (
    base_item_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id TEXT,
    kind game_object_kind NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES base_item(base_item_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS item (
    item_id TEXT PRIMARY KEY,
    weight INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS location (
    location_id TEXT PRIMARY KEY,
    FOREIGN KEY (location_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exit (
    exit_id TEXT PRIMARY KEY,
    direction TEXT NOT NULL,
    destination_id TEXT NOT NULL,
    FOREIGN KEY (exit_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES location(location_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS character (
    character_id TEXT PRIMARY KEY,
    capacity INTEGER NOT NULL,
    backstory TEXT NOT NULL,
    mood TEXT NULL,
    current_intent TEXT NULL,
    goal TEXT NULL,
    FOREIGN KEY (character_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE
);

CREATE VIEW v_items AS
SELECT
	i.item_id,
	b.kind,
	b.name, 
	b.short_description,
	b.long_description,
	i.capacity,
	i.weight,
	b.owner_id
from item i
inner join base_item b on i.item_id = b.base_item_id;


CREATE VIEW v_locations AS
SELECT
	l.location_id,
	b.kind,
	b.name, 
	b.short_description,
	b.long_description,
	b.owner_id
from location l
INNER JOIN base_item b on l.location_id = b.base_item_id;


CREATE VIEW v_exits AS
SELECT
	e.exit_id,
	b.kind,
	b.name, 
	b.short_description,
	b.long_description,
	e.direction,
	e.destination_id,
	b.owner_id
FROM exit e
INNER JOIN base_item b on e.exit_id = b.base_item_id;

CREATE VIEW v_characters AS
SELECT
	c.character_id,
	b.kind,
	b.name, 
	b.short_description,
	b.long_description,
	c.capacity,
	c.backstory,
	c.mood,
	c.current_intent,
	c.goal,
	b.owner_id
FROM character c
INNER JOIN base_item b on c.character_id = b.base_item_id;
	


-- Insert Locations (no owners)
INSERT INTO base_item (base_item_id, name, short_description, long_description, kind) VALUES
('loc_forest_clearing', 'Forest Clearing', 'A peaceful forest clearing', 'A serene clearing in the heart of the forest, dappled with sunlight.', 'location'),
('loc_forest_path', 'Forest Path', 'A winding path through the forest', 'A narrow path weaving between ancient trees, their branches forming a canopy overhead.', 'location'),
('loc_winding_path', 'Winding Forest Path', 'A twisting path deeper in the forest', 'The path becomes more convoluted, with roots and undergrowth making progress difficult.', 'location'),
('loc_forest_edge', 'Edge of Forest', 'The border between forest and open land', 'The dense forest gradually gives way to open land. A cave entrance is visible nearby.', 'location'),
('loc_cave', 'Cave', 'A dark, mysterious cave', 'The mouth of a cave yawns before you, promising secrets within its shadowy depths.', 'location'),
('loc_rocky_passage', 'Rocky Passage', 'A narrow, rocky corridor', 'A tight passage hewn from solid rock, leading deeper into the earth.', 'location'),
('loc_wizard_lab', 'Wizard''s Lab', 'A room filled with arcane equipment', 'Bubbling potions, glowing crystals, and ancient tomes fill this mystical workshop.', 'location');

-- Insert Exits (with locations as owners and destinations)
INSERT INTO base_item (base_item_id, name, short_description, long_description, kind, owner_id) VALUES
('exit_to_clearing', 'Path to Clearing', 'A path leading to a clearing', 'A well-trodden path leading towards a brighter area of the forest.', 'exit', 'loc_forest_path'),
('exit_to_forest', 'Path to Forest', 'A path leading deeper into the forest', 'A narrow trail disappearing into the shadowy forest.', 'exit', 'loc_forest_clearing'),
('exit_to_winding', 'Winding Path', 'A twisting path', 'The path ahead becomes more convoluted, winding between ancient trees.', 'exit', 'loc_forest_path'),
('exit_to_edge', 'Forest Edge', 'The edge of the forest', 'The forest begins to thin out, revealing open land beyond.', 'exit', 'loc_winding_path'),
('exit_to_cave', 'Cave Entrance', 'The mouth of a cave', 'A dark opening in the rocky hillside, leading underground.', 'exit', 'loc_forest_edge'),
('exit_to_rocky', 'Rocky Corridor', 'A narrow passage', 'A tight corridor carved from the living rock, leading deeper into the cave system.', 'exit', 'loc_cave'),
('exit_to_lab', 'Lab Entrance', 'A heavy wooden door', 'An ornate door marked with mystical symbols, likely leading to a wizard''s sanctuary.', 'exit', 'loc_rocky_passage');

-- Insert Characters (with locations as owners)
INSERT INTO base_item (base_item_id, name, short_description, long_description, kind, owner_id) VALUES
('char_max', 'Max', 'A sly-looking rogue', 'Max has a mischievous glint in his eye and moves with cat-like grace.', 'character', 'loc_forest_clearing'),
('char_vincent', 'Vincent', 'A wizened old wizard', 'Vincent''s long white beard and star-speckled robes mark him as a powerful mage.', 'character', 'loc_wizard_lab');

-- Insert Items (with locations, characters, or other items as owners)
INSERT INTO base_item (base_item_id, name, short_description, long_description, kind, owner_id) VALUES
('item_backpack', 'Backpack', 'A sturdy leather backpack', 'A well-made backpack with multiple pockets, perfect for an adventurer.', 'item', 'char_max');

INSERT INTO base_item (base_item_id, name, short_description, long_description, kind, owner_id) VALUES
('item_stick', 'Stick', 'A simple wooden stick', 'A sturdy stick, about arm''s length. Could be useful.', 'item', 'loc_forest_clearing'),
('item_pinecone', 'Pinecone', 'A brown pinecone', 'A dry pinecone, fallen from one of the towering pines.', 'item', 'loc_forest_clearing'),
('item_apple_core', 'Apple Core', 'The remains of an apple', 'The core of an apple, browning with age. Someone''s leftover snack?', 'item', 'item_backpack'),
('item_stone', 'Interesting Stone', 'A peculiar-looking stone', 'A smooth stone with unusual patterns. It seems to catch the light in an odd way.', 'item', 'loc_forest_edge'),
('item_rusty_knife', 'Rusty Knife', 'An old, rusted knife', 'Once sharp, this knife has seen better days. The blade is rusted but might still be useful.', 'item', 'loc_cave'),
('item_magic_wand', 'Magic Wand', 'A slender wooden wand', 'A finely crafted wand humming with magical energy.', 'item', 'loc_wizard_lab');


-- Link Locations to base_item
INSERT INTO location (location_id) 
SELECT base_item_id FROM base_item WHERE kind = 'location';

-- Link Items to base_item and set properties
INSERT INTO item (item_id, weight, capacity) VALUES
('item_stick', 2, 0),
('item_pinecone', 1, 0),
('item_apple_core', 1, 0),
('item_stone', 3, 0),
('item_rusty_knife', 2, 0),
('item_magic_wand', 1, 0),
('item_backpack', 5, 50);

-- Link Characters to base_item and set properties
INSERT INTO character (character_id, capacity, backstory) VALUES
('char_max', 30, 'A skilled thief with a heart of gold, Max turned to adventuring to pay off old debts.'),
('char_vincent', 20, 'Once a court wizard, Vincent now seeks ancient magical artifacts to restore his reputation.');

-- Link Exits to base_item and set properties
INSERT INTO exit (exit_id, direction, destination_id) VALUES
('exit_to_clearing', 'north', 'loc_forest_clearing'),
('exit_to_forest', 'south', 'loc_forest_path'),
('exit_to_winding', 'east', 'loc_winding_path'),
('exit_to_edge', 'west', 'loc_forest_edge'),
('exit_to_cave', 'north', 'loc_cave'),
('exit_to_rocky', 'east', 'loc_rocky_passage'),
('exit_to_lab', 'north', 'loc_wizard_lab');