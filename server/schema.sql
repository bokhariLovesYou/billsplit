CREATE TABLE IF NOT EXISTS periods (
  period text PRIMARY KEY,
  target bigint NOT NULL CHECK (target >= 0),
  carry bigint NOT NULL CHECK (carry >= 0),
  note text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS contributions (
  id uuid PRIMARY KEY,
  period text NOT NULL REFERENCES periods(period) ON DELETE CASCADE,
  amount bigint NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  position integer NOT NULL,
  reserved integer NOT NULL DEFAULT 0 CHECK (reserved IN (0, 1))
);
CREATE INDEX IF NOT EXISTS contributions_by_period ON contributions(period, position);
CREATE TABLE IF NOT EXISTS extras (
  id uuid PRIMARY KEY,
  date text NOT NULL,
  amount bigint NOT NULL CHECK (amount > 0),
  description text NOT NULL,
  note text NOT NULL,
  reference integer NOT NULL CHECK (reference IN (0, 1))
);

CREATE TABLE IF NOT EXISTS billsplit_months (
  month_key text PRIMARY KEY,
  data jsonb NOT NULL
);
