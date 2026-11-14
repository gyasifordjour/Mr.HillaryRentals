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

function normalizeId(value: unknown) {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : null;
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
    console.error("Missing Supabase URL or service-role key for delete-farmer.");
    return respond({ error: "Farmer account deletion is not configured on the server." }, 500);
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
    return respond({ error: "Only administrators can delete farmer accounts." }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    const body: unknown = await request.json();
    if (!isRecord(body)) {
      return respond({ error: "Provide the farmer account to delete." }, 400);
    }
    payload = body;
  } catch {
    return respond({ error: "The request body must be valid JSON." }, 400);
  }

  const farmerId = normalizeId(payload.farmer_id);
  if (!farmerId) {
    return respond({ error: "Provide a valid farmer account identifier." }, 400);
  }
  if (farmerId === authData.user.id) {
    return respond({ error: "You cannot delete the account you are signed in with." }, 400);
  }

  const { data: farmer, error: farmerError } = await adminClient
    .from("profiles")
    .select("id, full_name, role")
    .eq("id", farmerId)
    .maybeSingle();
  if (farmerError) {
    console.error("Could not load the farmer account:", farmerError.message);
    return respond({ error: "Could not load the farmer account." }, 500);
  }
  if (!farmer) return respond({ error: "That farmer account no longer exists." }, 404);
  if (farmer.role !== "farmer") {
    return respond({ error: "Only farmer accounts can be deleted here." }, 403);
  }

  const { data: rentalRows, error: rentalError } = await adminClient
    .from("rentals")
    .select("id")
    .eq("farmer_id", farmerId);
  if (rentalError) {
    console.error("Could not load the farmer rentals:", rentalError.message);
    return respond({ error: "Could not load the farmer rentals before deletion." }, 500);
  }
  const rentalIds = (rentalRows ?? []).map((row) => row.id);

  let affectedRoomIds: string[] = [];
  if (rentalIds.length) {
    const { data: roomLinks, error: roomLinkError } = await adminClient
      .from("rental_rooms")
      .select("room_id")
      .in("rental_id", rentalIds);
    if (roomLinkError) {
      console.error("Could not load the farmer rooms:", roomLinkError.message);
      return respond({ error: "Could not load the farmer rooms before deletion." }, 500);
    }
    affectedRoomIds = [...new Set((roomLinks ?? []).map((link) => link.room_id))];
  }

  const { error: paymentError } = await adminClient.from("payments").delete().eq("farmer_id", farmerId);
  if (paymentError) {
    console.error("Could not delete the farmer payments:", paymentError.message);
    return respond({ error: "Could not delete the farmer payment records. No account changes were made." }, 500);
  }

  const { error: serviceError } = await adminClient.from("service_requests").delete().eq("farmer_id", farmerId);
  if (serviceError) {
    console.error("Could not delete the farmer service requests:", serviceError.message);
    return respond({ error: "Could not delete the farmer service requests." }, 500);
  }

  if (rentalIds.length) {
    const { error: rentalDeleteError } = await adminClient.from("rentals").delete().in("id", rentalIds);
    if (rentalDeleteError) {
      console.error("Could not delete the farmer rentals:", rentalDeleteError.message);
      return respond({ error: "Could not delete the farmer rentals." }, 500);
    }
  }

  const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(farmerId);
  if (authDeleteError) {
    console.error("Could not delete the farmer Auth user:", authDeleteError.message);
    return respond({ error: "The farmer records were cleared, but the sign-in account could not be deleted. Try again." }, 500);
  }

  if (affectedRoomIds.length) {
    const { data: activeRentals, error: activeRentalError } = await adminClient
      .from("rentals")
      .select("id")
      .eq("status", "active");
    if (activeRentalError) {
      console.error("Could not check remaining active rentals:", activeRentalError.message);
    } else {
      const activeRentalIds = (activeRentals ?? []).map((row) => row.id);
      const { data: activeLinks, error: activeLinkError } = activeRentalIds.length
        ? await adminClient.from("rental_rooms").select("room_id").in("rental_id", activeRentalIds)
        : { data: [] as { room_id: string }[], error: null };
      if (activeLinkError) {
        console.error("Could not check remaining room assignments:", activeLinkError.message);
      } else {
        const stillOccupied = new Set((activeLinks ?? []).map((link) => link.room_id));
        const roomsToFree = affectedRoomIds.filter((roomId) => !stillOccupied.has(roomId));
        if (roomsToFree.length) {
          const { error: roomError } = await adminClient
            .from("rooms")
            .update({ status: "available" })
            .in("id", roomsToFree)
            .eq("status", "occupied");
          if (roomError) console.error("Could not release the farmer rooms:", roomError.message);
        }
      }
    }
  }

  return respond({
    deleted: true,
    message: `${farmer.full_name || "The farmer account"} and its rental records were deleted.`,
  }, 200);
});
