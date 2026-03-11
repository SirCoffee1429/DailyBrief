-- Create recipe_categories table
CREATE TABLE public.recipe_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default categories
INSERT INTO public.recipe_categories (name) VALUES
    ('Salad'),
    ('Fry'),
    ('Sauces'),
    ('BBQ'),
    ('Grill'),
    ('Sautee'),
    ('Add-Ons'),
    ('Uncategorized');

-- Add RLS policies
ALTER TABLE public.recipe_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.recipe_categories FOR SELECT USING (true);
CREATE POLICY "Enable insert, update, delete for all users" ON public.recipe_categories FOR ALL USING (true);
