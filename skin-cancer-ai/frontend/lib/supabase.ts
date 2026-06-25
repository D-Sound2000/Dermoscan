import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

type DemoUser = {
  id: string;
  email: string;
};

type DemoSession = {
  user: DemoUser;
};

const SESSION_KEY = "dermoscan.demo.session";
const PROFILES_KEY = "dermoscan.demo.profiles";
const SCANS_KEY = "dermoscan.demo.scans";

function isLocalSupabaseUrl(value: string | undefined) {
  if (!value) return true;
  return value.includes("127.0.0.1") || value.includes("localhost");
}

function isLocalBrowser() {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

function shouldUseDemoClient() {
  return !supabaseUrl || !supabaseAnonKey || (isLocalSupabaseUrl(supabaseUrl) && !isLocalBrowser());
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

function userIdForEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  let hash = 0;
  for (let index = 0; index < normalized.length; index += 1) {
    hash = (hash * 31 + normalized.charCodeAt(index)) >>> 0;
  }
  return `demo-${hash.toString(16)}`;
}

function createDemoClient() {
  function getSessionValue(): DemoSession | null {
    return readJson<DemoSession | null>(SESSION_KEY, null);
  }

  function setSessionForEmail(email: string) {
    const user = { id: userIdForEmail(email), email: email.trim().toLowerCase() };
    const session = { user };
    writeJson(SESSION_KEY, session);

    const profiles = readJson<Record<string, Partial<Profile>>>(PROFILES_KEY, {});
    if (!profiles[user.id]) {
      profiles[user.id] = { id: user.id };
      writeJson(PROFILES_KEY, profiles);
    }

    return session;
  }

  return {
    auth: {
      async signUp({ email }: { email: string; password: string }) {
        const session = setSessionForEmail(email);
        return { data: { user: session.user, session }, error: null };
      },
      async signInWithPassword({ email }: { email: string; password: string }) {
        const session = setSessionForEmail(email);
        return { data: { user: session.user, session }, error: null };
      },
      async getSession() {
        return { data: { session: getSessionValue() }, error: null };
      },
      async getUser() {
        const session = getSessionValue();
        return { data: { user: session?.user ?? null }, error: null };
      },
      async signOut() {
        if (typeof window !== "undefined") window.localStorage.removeItem(SESSION_KEY);
        return { error: null };
      },
    },
    from(table: string) {
      if (table === "scans") {
        return {
          select() {
            return {
              async eq(column: string, value: string) {
                const scans = readJson<Scan[]>(SCANS_KEY, []);
                return {
                  data: scans.filter((scan) => scan[column as keyof Scan] === value),
                  error: null,
                };
              },
            };
          },
          async insert(row: Omit<Scan, "id" | "scanned_at">) {
            const scans = readJson<Scan[]>(SCANS_KEY, []);
            const scan = {
              ...row,
              id: `scan-${Date.now().toString(36)}`,
              scanned_at: new Date().toISOString(),
            };
            scans.unshift(scan);
            writeJson(SCANS_KEY, scans);
            return { data: scan, error: null };
          },
        };
      }

      if (table === "profiles") {
        return {
          select() {
            return {
              eq(_column: string, id: string) {
                return {
                  async single() {
                    const profiles = readJson<Record<string, Partial<Profile>>>(PROFILES_KEY, {});
                    return { data: profiles[id] ?? null, error: null };
                  },
                };
              },
            };
          },
          async upsert(row: Profile) {
            const profiles = readJson<Record<string, Partial<Profile>>>(PROFILES_KEY, {});
            profiles[row.id] = { ...(profiles[row.id] ?? {}), ...row };
            writeJson(PROFILES_KEY, profiles);
            return { data: row, error: null };
          },
        };
      }

      return {
        select() {
          return {
            eq() {
              return {
                async single() {
                  return { data: null, error: null };
                },
              };
            },
          };
        },
        async upsert() {
          return { data: null, error: null };
        },
      };
    },
  };
}

export function createClient() {
  if (shouldUseDemoClient()) {
    return createDemoClient() as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(supabaseUrl!, supabaseAnonKey!);
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

export type Scan = {
  id: string;
  user_id: string;
  mole_label: string;
  malignant_probability: number;
  benign_probability: number;
  predicted_class: string;
  report_id: string;
  scanned_at: string;
};
