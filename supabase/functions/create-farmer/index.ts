import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-api-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function respond(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function getFarmerSignInRedirect(origin: string | null, allowedHttpsOrigins: Set<string>) {
  if (!origin) return null;

  try {
    const appUrl = new URL(origin);
    const isLocalHttp = appUrl.protocol === "http:"
      && ["localhost", "127.0.0.1", "[::1]"].includes(appUrl.hostname);
    const isAllowedHttps = appUrl.protocol === "https:" && allowedHttpsOrigins.has(appUrl.origin);
    if (appUrl.origin !== origin || (!isAllowedHttps && !isLocalHttp)) return null;

    const redirect = new URL("/login", appUrl.origin);
    redirect.searchParams.set("returnTo", "/dashboard");
    return redirect.toString();
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (request.method !== "POST") {
    return respond({ error: "Method not allowed." }, 405);
  }

  const authorization = request.headers.get("Authorization");
  const accessToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!accessToken) return respond({ error: "Sign in as an administrator to continue." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Missing Supabase URL, service-role key, or anon key for create-farmer.");
    return respond({ error: "Farmer account creation is not configured on the server." }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return respond({ error: "Your session is invalid or has expired. Sign in again." }, 401);
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (profileError) {
    console.error("Could not verify the requesting administrator:", profileError.message);
    return respond({ error: "Could not verify administrator permissions." }, 500);
  }
  if (profile?.role !== "admin") {
    return respond({ error: "Only administrators can create farmer accounts." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return respond({ error: "Provide a farmer name and email address." }, 400);
    }
    payload = body;
  } catch {
    return respond({ error: "The request body must be valid JSON." }, 400);
  }

  const fullName = typeof payload.full_name === "string"
    ? payload.full_name.replace(/\s+/g, " ").trim()
    : "";
  const email = normalizeEmail(payload.email);
  if (fullName.length < 2 || fullName.length > 100) {
    return respond({ error: "Enter a name between 2 and 100 characters." }, 400);
  }
  if (!email) {
    return respond({ error: "Enter a valid email address." }, 400);
  }

  const allowedHttpsOrigins = new Set(
    (Deno.env.get("APP_ORIGINS") ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  );
  const emailRedirectTo = getFarmerSignInRedirect(request.headers.get("Origin"), allowedHttpsOrigins);
  if (!emailRedirectTo) {
    return respond({ error: "This app URL is not allowed for farmer sign-in links. Open the approved app URL and try again." }, 400);
  }

  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    email_confirm: false,
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    if (createError?.message.toLowerCase().includes("already")) {
      return respond({ error: "That email address already has an account." }, 409);
    }
    console.error("Could not create farmer Auth user:", createError?.message ?? "No user returned.");
    return respond({ error: "Could not create the farmer account." }, 500);
  }

  const emailClient = createClient(supabaseUrl, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: emailError } = await emailClient.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false, emailRedirectTo },
  });

  if (emailError) {
    console.error(`Farmer ${created.user.id} was created, but the welcome email could not be sent:`, emailError.message);
    return respond({
      farmer_id: created.user.id,
      email_sent: false,
      message: "The account was created, but the email could not be sent. Ask the farmer to request a new sign-in link from the sign-in page.",
    }, 201);
  }

  return respond({
    farmer_id: created.user.id,
    email_sent: true,
    message: "The farmer account was created and a sign-in link was sent by email.",
  }, 201);
});
