-- Add unique username to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username_lower ON profiles (LOWER(username));

-- Follow requests table
CREATE TABLE IF NOT EXISTS follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  following_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE follows ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see follows
CREATE POLICY "Authenticated can view follows" ON follows
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only the follower can initiate
CREATE POLICY "Follower can send request" ON follows
  FOR INSERT WITH CHECK (auth.uid() = follower_id);

-- The person being followed can accept/decline; follower can cancel
CREATE POLICY "Following can respond, follower can update" ON follows
  FOR UPDATE USING (auth.uid() = following_id OR auth.uid() = follower_id);

-- Follower can cancel / unfollow
CREATE POLICY "Follower can delete" ON follows
  FOR DELETE USING (auth.uid() = follower_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE follows;
