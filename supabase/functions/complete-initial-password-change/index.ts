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
  if (!accessToken) return respond({ error: "Sign in to choose a new password." }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase URL or service-role key for complete-initial-password-change.");
    return respond({ error: "Password changes are not configured on the server." }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return respond({ error: "Your session is invalid or has expired. Sign in again." }, 401);
  }

  if (authData.user.app_metadata.must_change_password !== true) {
    return respond({ error: "This account does not need a first-sign-in password change." }, 400);
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return respond({ error: "Enter a new password." }, 400);
    payload = body;
  } catch {
    return respond({ error: "The request body must be valid JSON." }, 400);
  }

  const password = typeof payload.password === "string" ? payload.password : "";
  if (password.length < 12 || password.length > 72) {
    return respond({ error: "Use a password between 12 and 72 characters." }, 400);
  }

  const { error: updateError } = await adminClient.auth.admin.updateUserById(authData.user.id, {
    password,
    app_metadata: { ...authData.user.app_metadata, must_change_password: false },
  });
  if (updateError) {
    console.error("Could not complete the initial password change:", updateError.message);
    return respond({ error: "The new password could not be saved. Try again." }, 500);
  }

  return respond({
    must_change_password: false,
    message: "Password updated. The farmer account is ready to use.",
  }, 200);
});
