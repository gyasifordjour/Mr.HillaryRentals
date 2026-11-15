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

function normalizeEmail(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

function temporaryPassword() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const characters = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]);
  return `Farm-${characters.slice(0, 4).join("")}-${characters.slice(4, 8).join("")}-${characters.slice(8, 12).join("")}`;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error.";
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
  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing Supabase URL or service-role key for create-farmer.");
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return respond({ error: "The farmer details could not be read." }, 400);
  }

  const fullName = (form.get("full_name") ?? "").toString().replace(/\s+/g, " ").trim();
  const email = normalizeEmail(form.get("email"));
  const phone = (form.get("phone") ?? "").toString().trim();
  const avatarEntry = form.get("avatar");
  const avatar = avatarEntry instanceof File && avatarEntry.size > 0 ? avatarEntry : null;

  if (fullName.length < 2 || fullName.length > 100) {
    return respond({ error: "Enter a name between 2 and 100 characters." }, 400);
  }
  if (!email) return respond({ error: "Enter a valid email address." }, 400);
  if (phone.length > 30) return respond({ error: "Enter a shorter phone number." }, 400);
  if (avatarEntry && !(avatarEntry instanceof File)) {
    return respond({ error: "Choose a valid profile picture." }, 400);
  }
  if (avatar && !["image/jpeg", "image/png", "image/webp"].includes(avatar.type)) {
    return respond({ error: "Choose a JPG, PNG, or WebP profile picture." }, 400);
  }
  if (avatar && avatar.size > 5 * 1024 * 1024) {
    return respond({ error: "Profile pictures must be 5 MB or smaller." }, 400);
  }

  const password = temporaryPassword();
  const { data: created, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { must_change_password: true },
    user_metadata: { full_name: fullName },
  });
  if (createError || !created.user) {
    if (createError?.message.toLowerCase().includes("already")) {
      return respond({ error: "That email address already has an account." }, 409);
    }
    console.error("Could not create farmer Auth user:", createError?.message ?? "No user returned.");
    return respond({ error: "Could not create the farmer account." }, 500);
  }

  const farmerId = created.user.id;
  let avatarPath: string | null = null;
  if (avatar) {
    const extension = avatar.type === "image/jpeg" ? "jpg" : avatar.type.split("/")[1];
    avatarPath = `${farmerId}/${crypto.randomUUID()}.${extension}`;
    const { error: uploadError } = await adminClient.storage.from("profile-avatars").upload(avatarPath, avatar, {
      contentType: avatar.type,
      upsert: false,
    });
    if (uploadError) {
      const { error: cleanupError } = await adminClient.auth.admin.deleteUser(farmerId);
      if (cleanupError) console.error("Could not remove farmer account after profile picture upload failed:", cleanupError.message);
      console.error("Could not upload farmer profile picture:", uploadError.message);
      return respond({ error: "The profile picture could not be uploaded, so the farmer account was not created." }, 500);
    }
  }

  const { error: updateError } = await adminClient
    .from("profiles")
    .update({ full_name: fullName, email, phone: phone || null, avatar_path: avatarPath })
    .eq("id", farmerId);
  if (updateError) {
    if (avatarPath) {
      const { error: imageCleanupError } = await adminClient.storage.from("profile-avatars").remove([avatarPath]);
      if (imageCleanupError) console.error("Could not remove uploaded profile picture after profile save failed:", imageCleanupError.message);
    }
    const { error: userCleanupError } = await adminClient.auth.admin.deleteUser(farmerId);
    if (userCleanupError) console.error("Could not remove farmer account after profile save failed:", userCleanupError.message);
    if (updateError.code === "23505") {
      return respond({ error: "That phone number belongs to another account." }, 409);
    }
    console.error("Could not save farmer profile:", updateError.message);
    return respond({ error: "The farmer profile could not be saved." }, 500);
  }

  return respond({
    farmer_id: farmerId,
    temporary_password: password,
    message: "The farmer account was created with a verified email. Share the temporary password securely; the farmer will be required to change it at first sign-in.",
  }, 201);
});
