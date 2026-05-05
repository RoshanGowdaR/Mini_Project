-- Table: auction_orders — tracks delivery status of won auction items
CREATE TABLE IF NOT EXISTS auction_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,
  artisan_id TEXT NOT NULL,
  winner_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'won',
  artisan_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auction_id)
);

-- Table: auction_contact_requests — consent-based phone exchange
CREATE TABLE IF NOT EXISTS auction_contact_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,
  requester_id TEXT NOT NULL,
  requester_role TEXT NOT NULL,
  requester_phone TEXT NOT NULL,
  responder_id TEXT NOT NULL,
  responder_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auction_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_auction_orders_auction_id ON auction_orders(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_orders_artisan_id ON auction_orders(artisan_id);
CREATE INDEX IF NOT EXISTS idx_auction_orders_winner_id ON auction_orders(winner_id);
CREATE INDEX IF NOT EXISTS idx_auction_contact_requests_auction_id ON auction_contact_requests(auction_id);
