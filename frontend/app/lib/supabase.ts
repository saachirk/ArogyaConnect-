import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yeaxovlcajneedcnbgwn.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InllYXhvdmxjYWpuZWVkY25iZ3duIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMzEzNjgsImV4cCI6MjEwMzkwNzM2OH0.V0sl04Ayqg0kTNCfbfnTnXJEtjFLVoDdA4EjwN0xWm4';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
