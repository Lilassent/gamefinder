BEGIN;

--users
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL        PRIMARY KEY,
  nickname      VARCHAR(50)   UNIQUE NOT NULL,
  email         VARCHAR(100)  UNIQUE NOT NULL,
  password_hash TEXT          NOT NULL,
  google_uid    TEXT UNIQUE,                -- Google OAuth UID
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

--games
CREATE TABLE IF NOT EXISTS games (
  id         SERIAL       PRIMARY KEY,
  rawg_id    INTEGER      UNIQUE NOT NULL,   -- RAWG API ID
  title      VARCHAR(255) NOT NULL,
  slug       VARCHAR(255),
  image_url  TEXT,
  genres     TEXT[],                         -- e.g. {"RPG","JRPG"}
  platforms  TEXT[],                         -- e.g. {"PC","PS5"}
  released   DATE,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
);

--likes (wishlist)
CREATE TABLE IF NOT EXISTS likes (
  user_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id  INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  liked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, game_id)
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_likes_user ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_game ON likes(game_id);

--password reset codes
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id         SERIAL     PRIMARY KEY,
  user_id    INTEGER    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash  TEXT       NOT NULL,             -- store only a hash, never the raw code
  expires_at TIMESTAMP  NOT NULL,
  used_at    TIMESTAMP,
  created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP
);

-- Query by user + unused/used state efficiently
CREATE INDEX IF NOT EXISTS prc_user_idx
  ON password_reset_codes (user_id, used_at);

COMMIT;
