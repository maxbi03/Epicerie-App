-- Migration : lier producers aux users (authentification unifiée)
-- Les producteurs s'authentifient désormais via le système users (role = 'producer')
-- plus besoin de password_hash dans producers

ALTER TABLE producers
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Index pour les lookups par user_id
CREATE INDEX IF NOT EXISTS producers_user_id_idx ON producers(user_id);
