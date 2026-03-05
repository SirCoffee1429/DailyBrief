import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://chajwmoohmiugdgvqjyo.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNoYWp3bW9vaG1pdWdkZ3ZxanlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1MjE2OTIsImV4cCI6MjA4ODA5NzY5Mn0.EVG62JLjh4TEekw9FjvCB36o0pC8SzptQ-wO_ymAChY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
