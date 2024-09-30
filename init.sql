CREATE TYPE game_object_kind AS ENUM ('item', 'location', 'exit', 'character');

CREATE TABLE IF NOT EXISTS base_item (
    base_item_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    short_description TEXT NOT NULL,
    long_description TEXT NOT NULL,
    owner_id INTEGER,
    kind game_object_kind NOT NULL,
    FOREIGN KEY (owner_id) REFERENCES base_item(base_item_id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS item (
    item_id SERIAL PRIMARY KEY,
    weight INTEGER NOT NULL,
    capacity INTEGER NOT NULL,
    FOREIGN KEY (item_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS location (
    location_id SERIAL PRIMARY KEY,
    FOREIGN KEY (location_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exit (
    exit_id SERIAL PRIMARY KEY,
    direction TEXT NOT NULL,
    destination_id INTEGER NOT NULL,
    FOREIGN KEY (exit_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE,
    FOREIGN KEY (destination_id) REFERENCES location(location_id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS character (
    character_id SERIAL PRIMARY KEY,
    capacity INTEGER NOT NULL,
    backstory TEXT NOT NULL,
    FOREIGN KEY (character_id) REFERENCES base_item(base_item_id) ON DELETE CASCADE
);

-- Insert Locations
INSERT INTO base_item (name, short_description, long_description, kind) VALUES
('Forest Clearing', 'A peaceful forest clearing', 'A serene clearing in the heart of the forest, dappled with sunlight.', 'location'),
('Forest Path', 'A winding path through the forest', 'A narrow path weaving between ancient trees, their branches forming a canopy overhead.', 'location'),
('Winding Forest Path', 'A twisting path deeper in the forest', 'The path becomes more convoluted, with roots and undergrowth making progress difficult.', 'location'),
('Edge of Forest', 'The border between forest and open land', 'The dense forest gradually gives way to open land. A cave entrance is visible nearby.', 'location'),
('Cave', 'A dark, mysterious cave', 'The mouth of a cave yawns before you, promising secrets within its shadowy depths.', 'location'),
('Rocky Passage', 'A narrow, rocky corridor', 'A tight passage hewn from solid rock, leading deeper into the earth.', 'location'),
('Wizard''s Lab', 'A room filled with arcane equipment', 'Bubbling potions, glowing crystals, and ancient tomes fill this mystical workshop.', 'location');

-- Insert Items
INSERT INTO base_item (name, short_description, long_description, kind) VALUES
('Stick', 'A simple wooden stick', 'A sturdy stick, about arm''s length. Could be useful.', 'item'),
('Pinecone', 'A brown pinecone', 'A dry pinecone, fallen from one of the towering pines.', 'item'),
('Apple Core', 'The remains of an apple', 'The core of an apple, browning with age. Someone''s leftover snack?', 'item'),
('Interesting Stone', 'A peculiar-looking stone', 'A smooth stone with unusual patterns. It seems to catch the light in an odd way.', 'item'),
('Rusty Knife', 'An old, rusted knife', 'Once sharp, this knife has seen better days. The blade is rusted but might still be useful.', 'item'),
('Magic Wand', 'A slender wooden wand', 'A finely crafted wand humming with magical energy.', 'item'),
('Backpack', 'A sturdy leather backpack', 'A well-made backpack with multiple pockets, perfect for an adventurer.', 'item');

-- Insert Characters
INSERT INTO base_item (name, short_description, long_description, kind) VALUES
('Max', 'A sly-looking rogue', 'Max has a mischievous glint in his eye and moves with cat-like grace.', 'character'),
('Vincent', 'A wizened old wizard', 'Vincent''s long white beard and star-speckled robes mark him as a powerful mage.', 'character');

-- Insert Exits
INSERT INTO base_item (name, short_description, long_description, kind) VALUES
('Path to Clearing', 'A path leading to a clearing', 'A well-trodden path leading towards a brighter area of the forest.', 'exit'),
('Path to Forest', 'A path leading deeper into the forest', 'A narrow trail disappearing into the shadowy forest.', 'exit'),
('Winding Path', 'A twisting path', 'The path ahead becomes more convoluted, winding between ancient trees.', 'exit'),
('Forest Edge', 'The edge of the forest', 'The forest begins to thin out, revealing open land beyond.', 'exit'),
('Cave Entrance', 'The mouth of a cave', 'A dark opening in the rocky hillside, leading underground.', 'exit'),
('Rocky Corridor', 'A narrow passage', 'A tight corridor carved from the living rock, leading deeper into the cave system.', 'exit'),
('Lab Entrance', 'A heavy wooden door', 'An ornate door marked with mystical symbols, likely leading to a wizard''s sanctuary.', 'exit');

-- Link Locations to base_item
INSERT INTO location (location_id) 
SELECT base_item_id FROM base_item WHERE kind = 'location';

-- Link Items to base_item and set properties
INSERT INTO item (item_id, weight, capacity)
SELECT base_item_id, 
    CASE 
        WHEN name = 'Stick' THEN 2
        WHEN name = 'Pinecone' THEN 1
        WHEN name = 'Apple Core' THEN 1
        WHEN name = 'Interesting Stone' THEN 3
        WHEN name = 'Rusty Knife' THEN 2
        WHEN name = 'Magic Wand' THEN 1
        WHEN name = 'Backpack' THEN 5
    END AS weight,
    CASE 
        WHEN name = 'Backpack' THEN 50
        ELSE 0
    END AS capacity
FROM base_item WHERE kind = 'item';

-- Link Characters to base_item and set properties
INSERT INTO character (character_id, capacity, backstory)
SELECT base_item_id, 
    CASE 
        WHEN name = 'Max' THEN 30
        WHEN name = 'Vincent' THEN 20
    END AS capacity,
    CASE 
        WHEN name = 'Max' THEN 'A skilled thief with a heart of gold, Max turned to adventuring to pay off old debts.'
        WHEN name = 'Vincent' THEN 'Once a court wizard, Vincent now seeks ancient magical artifacts to restore his reputation.'
    END AS backstory
FROM base_item WHERE kind = 'character';

-- Link Exits to base_item and set properties
INSERT INTO exit (exit_id, direction, destination_id)
SELECT e.base_item_id, 
    CASE 
        WHEN e.name = 'Path to Clearing' THEN 'north'
        WHEN e.name = 'Path to Forest' THEN 'south'
        WHEN e.name = 'Winding Path' THEN 'east'
        WHEN e.name = 'Forest Edge' THEN 'west'
        WHEN e.name = 'Cave Entrance' THEN 'north'
        WHEN e.name = 'Rocky Corridor' THEN 'east'
        WHEN e.name = 'Lab Entrance' THEN 'north'
    END AS direction,
    l.base_item_id AS destination_id
FROM base_item e
JOIN base_item l ON 
    CASE 
        WHEN e.name = 'Path to Clearing' THEN l.name = 'Forest Clearing'
        WHEN e.name = 'Path to Forest' THEN l.name = 'Forest Path'
        WHEN e.name = 'Winding Path' THEN l.name = 'Winding Forest Path'
        WHEN e.name = 'Forest Edge' THEN l.name = 'Edge of Forest'
        WHEN e.name = 'Cave Entrance' THEN l.name = 'Cave'
        WHEN e.name = 'Rocky Corridor' THEN l.name = 'Rocky Passage'
        WHEN e.name = 'Lab Entrance' THEN l.name = 'Wizard''s Lab'
    END
WHERE e.kind = 'exit' AND l.kind = 'location';

-- Set item locations
UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Forest Clearing' AND kind = 'location')
WHERE name IN ('Stick', 'Pinecone') AND kind = 'item';

UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Forest Path' AND kind = 'location')
WHERE name = 'Apple Core' AND kind = 'item';

UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Edge of Forest' AND kind = 'location')
WHERE name = 'Interesting Stone' AND kind = 'item';

UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Cave' AND kind = 'location')
WHERE name = 'Rusty Knife' AND kind = 'item';

UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Wizard''s Lab' AND kind = 'location')
WHERE name = 'Magic Wand' AND kind = 'item';

UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Max' AND kind = 'character')
WHERE name = 'Backpack' AND kind = 'item';

-- Set character locations
UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Forest Clearing' AND kind = 'location')
WHERE name = 'Max' AND kind = 'character';

UPDATE base_item SET owner_id = (SELECT base_item_id FROM base_item WHERE name = 'Wizard''s Lab' AND kind = 'location')
WHERE name = 'Vincent' AND kind = 'character';