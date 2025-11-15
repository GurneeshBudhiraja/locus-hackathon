-- Add metorial_oauth_session_id column to contractors table
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS metorial_oauth_session_id VARCHAR(255);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contractors_metorial_session_id 
ON contractors(metorial_oauth_session_id);

