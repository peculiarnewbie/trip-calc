-- One-time history handoff for the existing Trip Calc D1 database.
-- Migrations 0001–0004 were checked against the __alchemy_migrations SHA-256
-- hashes and match the files in this repository. This records already-applied
-- migrations; it does not rerun them or modify application tables.
CREATE TABLE IF NOT EXISTS d1_migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

INSERT INTO d1_migrations (name, applied_at)
SELECT name, COALESCE(applied_at, CURRENT_TIMESTAMP)
FROM __alchemy_migrations
WHERE name IN (
  '0001_initial.sql',
  '0002_accounts.sql',
  '0003_person_color.sql',
  '0004_person_payment_info.sql'
)
AND NOT EXISTS (
  SELECT 1 FROM d1_migrations WHERE d1_migrations.name = __alchemy_migrations.name
);
