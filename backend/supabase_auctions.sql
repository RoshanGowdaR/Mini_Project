-- Table: auction_items
CREATE TABLE auction_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id TEXT NOT NULL,
  artisan_id TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  story TEXT,
  images JSONB DEFAULT '[]',
  starting_bid NUMERIC(10,2) NOT NULL,
  current_bid NUMERIC(10,2),
  current_winner_id TEXT,
  current_winner_name TEXT,
  admin_notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: auction_bids
CREATE TABLE auction_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,
  bidder_id TEXT NOT NULL,
  bidder_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  placed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: auction_registrations
CREATE TABLE auction_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID REFERENCES auction_items(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_email TEXT NOT NULL,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(auction_id, user_id)
);

-- Table: admin_users
CREATE TABLE admin_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_auction_items_status ON auction_items(status);
CREATE INDEX idx_auction_bids_auction_id ON auction_bids(auction_id);
CREATE INDEX idx_auction_registrations_auction_id ON auction_registrations(auction_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE auction_items;
ALTER PUBLICATION supabase_realtime ADD TABLE auction_bids;
