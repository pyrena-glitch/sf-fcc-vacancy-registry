-- =============================================
-- Add Organizations Support
-- Run this in Supabase SQL Editor
-- =============================================

-- 1. Create organizations table
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  website_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Add organization_id to providers (if not exists)
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 3. Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_providers_organization ON providers(organization_id);

-- 4. Enable RLS on organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- 5. Allow public read of organizations (for widget)
CREATE POLICY "Public can view organizations"
  ON organizations FOR SELECT
  USING (true);

-- 6. Insert Modern Education organization
INSERT INTO organizations (name, slug, website_url)
VALUES (
  'Modern Education Family Childcare',
  'modern-education',
  'https://www.daycaresf.com'
)
ON CONFLICT (slug) DO NOTHING;

-- 7. View the organization ID (copy this for next step)
SELECT id, name, slug FROM organizations WHERE slug = 'modern-education';
