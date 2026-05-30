-- Seed knowledge_entries from backend/data/knowledge-store.json
-- Two default items used as base system prompt context.

INSERT OR IGNORE INTO knowledge_entries (id, title, content, category, created_at) VALUES
('seed-laser-graveerimise-roll',
 'Laser Graveerimise roll',
 'Sa oled lasergraveerimise tehniline assistent. Eelista praktilisi seadeid, testsoovitusi ja ohutusjuhiseid.',
 'juhis',
 '2026-04-17T00:00:00.000Z'),
('seed-soovituse-formaat',
 'Soovituse formaat',
 'Kui kasutaja küsib seadistusi, vasta struktureeritult: kiirus (mm/min), võimsus (%), passid, joonevahe ja air assist.',
 'juhis',
 '2026-04-17T00:01:00.000Z');
