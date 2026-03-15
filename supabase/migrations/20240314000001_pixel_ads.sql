-- Pixel ads table: each row = one purchased block region (start_x, start_y, width, height in PIXEL units; we store in 10-pixel blocks)
-- Coordinates are in BLOCK indices (0-99), so 10x10 block at top-left = start_x=0, start_y=0, width=1, height=1 (1 block = 10 pixels)
CREATE TABLE IF NOT EXISTS pixel_ads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_x INTEGER NOT NULL CHECK (start_x >= 0 AND start_x < 100),
  start_y INTEGER NOT NULL CHECK (start_y >= 0 AND start_y < 100),
  width INTEGER NOT NULL CHECK (width >= 1 AND width <= 100),
  height INTEGER NOT NULL CHECK (height >= 1 AND height <= 100),
  image_url TEXT,
  advertiser_name TEXT NOT NULL,
  link TEXT NOT NULL,
  purchase_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_payment_id TEXT NOT NULL UNIQUE,
  approved BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Block coordinates: we use block indices (0-99). Overlap check: two rectangles (a,b) and (c,d) overlap iff not (a.start_x + a.width <= c.start_x OR c.start_x + c.width <= a.start_x OR same for y)
-- We enforce no-overlap via a trigger that checks new/updated rows against existing ones.
CREATE OR REPLACE FUNCTION check_pixel_ads_no_overlap()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pixel_ads
    WHERE id IS NOT NULL
      AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
      AND NOT (NEW.start_x + NEW.width <= start_x OR start_x + width <= NEW.start_x
           OR NEW.start_y + NEW.height <= start_y OR start_y + height <= NEW.start_y)
  ) THEN
    RAISE EXCEPTION 'Pixel region overlaps with an existing ad';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pixel_ads_no_overlap_trigger ON pixel_ads;
CREATE TRIGGER pixel_ads_no_overlap_trigger
  BEFORE INSERT OR UPDATE ON pixel_ads
  FOR EACH ROW EXECUTE FUNCTION check_pixel_ads_no_overlap();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pixel_ads_updated_at ON pixel_ads;
CREATE TRIGGER pixel_ads_updated_at
  BEFORE UPDATE ON pixel_ads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS: public read for approved ads; insert/update/delete only with service role or admin
ALTER TABLE pixel_ads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read approved pixel_ads"
  ON pixel_ads FOR SELECT
  USING (approved = true);

CREATE POLICY "Service role full access pixel_ads"
  ON pixel_ads FOR ALL
  USING (auth.role() = 'service_role');

-- Storage bucket for ad images (create via Supabase dashboard or API; policy: authenticated upload, public read)
-- Run in SQL or Dashboard: insert into storage.buckets (id, name, public) values ('ad-images', 'ad-images', true);
-- Policy: allow public read; allow insert/update for authenticated or anon with size limit (e.g. 1MB)
