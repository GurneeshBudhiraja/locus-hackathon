-- Add repo_owner column to contractors table
ALTER TABLE contractors 
ADD COLUMN IF NOT EXISTS repo_owner VARCHAR(255) NOT NULL DEFAULT '';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_contractors_repo_owner 
ON contractors(repo_owner);

