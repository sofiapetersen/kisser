-- Add status column to connections table with default value
ALTER TABLE public.connections 
ADD COLUMN status TEXT DEFAULT 'pending';

-- Update existing connections to have 'accepted' status so they remain visible
UPDATE public.connections 
SET status = 'accepted' 
WHERE status IS NULL;