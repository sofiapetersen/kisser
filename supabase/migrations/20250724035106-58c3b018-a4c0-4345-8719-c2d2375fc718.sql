-- Fix table structures to match the schema
-- Make ID columns auto-generated and fix the tables

-- Drop existing tables and recreate with proper structure
DROP TABLE IF EXISTS public.connections CASCADE;
DROP TABLE IF EXISTS public.names CASCADE;

-- Recreate names table with proper auto-generated ID
CREATE TABLE public.names (
    id BIGSERIAL PRIMARY KEY,
    name TEXT,
    instagram TEXT
);

-- Recreate connections table with proper auto-generated ID  
CREATE TABLE public.connections (
    id BIGSERIAL PRIMARY KEY,
    name1 TEXT,
    name2 TEXT
);

-- Enable RLS on both tables
ALTER TABLE public.names ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write to both tables
CREATE POLICY "Allow authenticated users to read names" ON public.names FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert names" ON public.names FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated users to read connections" ON public.connections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert connections" ON public.connections FOR INSERT TO authenticated WITH CHECK (true);