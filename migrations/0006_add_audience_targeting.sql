-- Add audience_targeting JSONB column to events table for ICP Match Rate calculation
ALTER TABLE events ADD COLUMN IF NOT EXISTS audience_targeting jsonb;

-- Add comment for documentation
COMMENT ON COLUMN events.audience_targeting IS 'Stores audience targeting configuration for ICP Match Rate calculation (companyTypes, roles, functions, accountFocus)';
