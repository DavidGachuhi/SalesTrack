// Supabase project credentials
const SUPABASE_URL = "https://ipyizpvhzsaiqbhmrlgh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlweWl6cHZoenNhaXFiaG1ybGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3MzM2MDgsImV4cCI6MjA5NTMwOTYwOH0.yJpA8m8ZCbkHw6v5c14QkCpTdCViIbs_ICOjIp_d4Fc";

// Create the Supabase client (using the CDN-loaded library)
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);