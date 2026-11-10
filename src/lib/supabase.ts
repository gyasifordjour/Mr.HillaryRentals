import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const publicKey = publishableKey ?? anonKey;

export const useMocks = import.meta.env.VITE_USE_MOCKS === "true" || !url || !publicKey;
export const useDemoAuth = import.meta.env.DEV && useMocks;

export const supabase = createClient(url ?? "http://localhost", publicKey ?? "public-anon-key");
