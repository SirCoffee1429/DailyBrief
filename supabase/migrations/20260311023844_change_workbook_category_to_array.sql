-- Convert the category column from text to an array of text
ALTER TABLE public.workbooks
    ALTER COLUMN category TYPE text[] 
    USING ARRAY[category],
    ALTER COLUMN category SET DEFAULT ARRAY['Uncategorized']::TEXT[];
