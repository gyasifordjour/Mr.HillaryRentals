// TODO: verify the caller's JWT, check an active rental covers this camera today
// (or caller is admin), then return a short-lived MediaMTX stream token.
Deno.serve(() => new Response("not implemented", { status: 501 }));
