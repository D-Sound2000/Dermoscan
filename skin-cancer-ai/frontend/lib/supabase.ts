import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export type Profile = {
  id: string;
  skin_type: number | null;
  age_range: string | null;
  activity_level: string | null;
  sunburn_history: string | null;
  location_name: string | null;
  latitude: number | null;
  longitude: number | null;
};
