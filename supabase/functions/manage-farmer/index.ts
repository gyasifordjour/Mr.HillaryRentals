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

function getSignInRedirect(origin: string | null, allowedHttpsOrigins: Set<string>) {
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
    console.error("Missing Supabase URL, service-role key, or anon key for manage-farmer.");
    return respond({ error: "Farmer account management is not configured on the server." }, 500);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authData, error: authError } = await adminClient.auth.getUser(accessToken);
  if (authError || !authData.user) {
    return respond({ error: "Your session is invalid or has expired. Sign in again." }, 401);
  }

  const { data: requester, error: requesterError } = await adminClient
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .maybeSingle();
  if (requesterError) {
    console.error("Could not verify the requesting administrator:", requesterError.message);
    return respond({ error: "Could not verify administrator permissions." }, 500);
  }
  if (requester?.role !== "admin") {
    return respond({ error: "Only administrators can manage farmer accounts." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) return respond({ error: "Provide a farmer account and action." }, 400);
    payload = body;
  } catch {
    return respond({ error: "The request body must be valid JSON." }, 400);
  }

  const action = typeof payload.action === "string" ? payload.action : "";
  const farmerId = typeof payload.farmer_id === "string" ? payload.farmer_id : "";
  if (!farmerId) return respond({ error: "Choose a farmer account." }, 400);

  const { data: farmer, error: farmerError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, phone, role, is_active")
    .eq("id", farmerId)
    .maybeSingle();
  if (farmerError) {
    console.error("Could not load the farmer profile:", farmerError.message);
    return respond({ error: "Could not load the farmer account." }, 500);
  }
  if (!farmer || farmer.role !== "farmer") {
    return respond({ error: "Choose a valid farmer account." }, 404);
  }

  if (action === "update") {
    const fullName = typeof payload.full_name === "string"
      ? payload.full_name.replace(/\s+/g, " ").trim()
      : "";
    const phone = typeof payload.phone === "string" ? payload.phone.trim() : "";
    if (fullName.length < 2 || fullName.length > 100) {
      return respond({ error: "Enter a name between 2 and 100 characters." }, 400);
    }
    if (phone.length > 30) {
      return respond({ error: "Enter a shorter phone number." }, 400);
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ full_name: fullName, phone: phone || null })
      .eq("id", farmerId);
    if (updateError) {
      if (updateError.code === "23505") return respond({ error: "That phone number belongs to another account." }, 409);
      console.error("Could not update the farmer profile:", updateError.message);
      return respond({ error: "The farmer account could not be updated." }, 500);
    }

    const { data: targetUser } = await adminClient.auth.admin.getUserById(farmerId);
    const { error: metadataError } = await adminClient.auth.admin.updateUserById(farmerId, {
      user_metadata: { ...(targetUser.user?.user_metadata ?? {}), full_name: fullName },
    });
    if (metadataError) {
      console.error("Farmer profile saved, but auth metadata was not updated:", metadataError.message);
    }

    return respond({ message: "Farmer details updated." }, 200);
  }

  if (action === "set_active") {
    if (typeof payload.active !== "boolean") {
      return respond({ error: "Choose whether the account should be active." }, 400);
    }
    const active = payload.active;

    const { error: stateError } = await adminClient
      .from("profiles")
      .update({ is_active: active })
      .eq("id", farmerId);
    if (stateError) {
      console.error("Could not update the farmer account state:", stateError.message);
      return respond({ error: "The farmer account state could not be updated." }, 500);
    }

    const { error: banError } = await adminClient.auth.admin.updateUserById(farmerId, {
      ban_duration: active ? "none" : "876000h",
    });
    if (banError) {
      console.error("Farmer profile state saved, but the sign-in ban was not applied:", banError.message);
      return respond({ error: "The account was updated, but sign-in access could not be changed. Try again." }, 500);
    }

    return respond({ message: active ? "Farmer account reactivated." : "Farmer account deactivated." }, 200);
  }

  if (action === "resend_link") {
    const email = typeof farmer.email === "string" ? farmer.email.trim().toLowerCase() : "";
    if (!email) return respond({ error: "This farmer has no email address on file." }, 400);

    const allowedHttpsOrigins = new Set(
      (Deno.env.get("APP_ORIGINS") ?? "")
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    );
    const emailRedirectTo = getSignInRedirect(request.headers.get("Origin"), allowedHttpsOrigins);
    if (!emailRedirectTo) {
      return respond({ error: "This app URL is not allowed for farmer sign-in links. Open the approved app URL and try again." }, 400);
    }

    const emailClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error: emailError } = await emailClient.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo },
    });
    if (emailError) {
      console.error(`Sign-in link for farmer ${farmerId} could not be sent:`, emailError.message);
      return respond({ error: "The sign-in link could not be sent right now." }, 502);
    }

    return respond({ message: "A fresh sign-in link was sent to the farmer." }, 200);
  }

  return respond({ error: "Unsupported farmer account action." }, 400);
});
