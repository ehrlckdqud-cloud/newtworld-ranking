CREATE TABLE IF NOT EXISTS draw_ranking_rounds (
  game        TEXT NOT NULL,
  round_id    TEXT NOT NULL,
  finished_at TEXT NOT NULL,
  standings   TEXT NOT NULL,
  scores      TEXT NOT NULL,
  PRIMARY KEY (game, round_id)
) WITHOUT ROWID;
