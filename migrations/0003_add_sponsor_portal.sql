-- Add sponsor portal fields to event_sponsors
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS contact_name VARCHAR(255);
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50);
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS social_links JSONB;
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS registration_seats INTEGER DEFAULT 0;
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS seats_used INTEGER DEFAULT 0;
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS base_invite_code_id VARCHAR REFERENCES invite_codes(id);
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS portal_access_token VARCHAR(255);
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS portal_token_expires_at TIMESTAMP;
ALTER TABLE event_sponsors ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Add sponsorId to invite_codes for linking child codes to sponsors
ALTER TABLE invite_codes ADD COLUMN IF NOT EXISTS sponsor_id VARCHAR REFERENCES event_sponsors(id);

-- Create sponsor_contacts table (people from sponsor company with portal access)
CREATE TABLE IF NOT EXISTS sponsor_contacts (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  sponsor_id VARCHAR NOT NULL REFERENCES event_sponsors(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  email VARCHAR(255) NOT NULL,
  job_title VARCHAR(255),
  phone VARCHAR(50),
  is_primary BOOLEAN DEFAULT false,
  portal_access_token VARCHAR(255),
  portal_token_expires_at TIMESTAMP,
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sponsor_tasks table (tasks that organizers assign to sponsors)
CREATE TABLE IF NOT EXISTS sponsor_tasks (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  event_id VARCHAR NOT NULL REFERENCES events(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  task_type VARCHAR(50) NOT NULL, -- 'company_info', 'logo_upload', 'bio', 'custom', etc.
  required_fields JSONB, -- for company_info type, specifies which fields are required
  is_required BOOLEAN DEFAULT false,
  due_date DATE,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create sponsor_task_completions table (track task completion per sponsor)
CREATE TABLE IF NOT EXISTS sponsor_task_completions (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id VARCHAR NOT NULL REFERENCES organizations(id),
  task_id VARCHAR NOT NULL REFERENCES sponsor_tasks(id),
  sponsor_id VARCHAR NOT NULL REFERENCES event_sponsors(id),
  status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'approved', 'rejected'
  submitted_data JSONB,
  completed_at TIMESTAMP,
  completed_by VARCHAR REFERENCES sponsor_contacts(id),
  reviewed_at TIMESTAMP,
  reviewed_by VARCHAR REFERENCES users(id),
  review_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_sponsor ON sponsor_contacts(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_contacts_email ON sponsor_contacts(email);
CREATE INDEX IF NOT EXISTS idx_sponsor_tasks_event ON sponsor_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_task_completions_sponsor ON sponsor_task_completions(sponsor_id);
CREATE INDEX IF NOT EXISTS idx_sponsor_task_completions_task ON sponsor_task_completions(task_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_sponsor ON invite_codes(sponsor_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_sponsor_task_completion_unique ON sponsor_task_completions(task_id, sponsor_id);
