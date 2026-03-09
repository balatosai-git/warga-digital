-- Add RT_BENDAHARA role (id 8) for Kas RT transaction submission permission.
-- Safe to run: uses ON CONFLICT so existing DBs get the role without duplicate key errors.
INSERT INTO roles (id, name, description, scope) VALUES
  (8, 'RT_BENDAHARA', 'Bendahara RT (bisa mencatat transaksi kas RT)', 'TENANT')
ON CONFLICT (id) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  scope       = EXCLUDED.scope;
