import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://mvokdnefwukzouuttsvz.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im12b2tkbmVmd3Vrem91dXR0c3Z6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAzNTA1NzksImV4cCI6MjEwNTkyNjU3OX0.KsNjS6EP6hyw2-JZlKgvV3AdqpZudVGCI7guH0YE9w4";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
