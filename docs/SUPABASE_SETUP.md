# Supabase setup

The app uses Supabase Auth and Postgres when `VITE_SUPABASE_URL` and
`VITE_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key) are set and
`VITE_USE_MOCKS` is not `true`. Only use browser-safe publishable/anon keys in
Vite; never put a secret/service-role key in the app.

## Apply the schema and sample farm data

1. Install the Supabase CLI and authenticate it.
2. Link this project with `supabase link --project-ref <project-ref>`.
3. Apply migrations and the account-free seed with
   `supabase db push --remote --include-seed`.
4. Copy `.env.example` to `.env.local`, then fill in the project URL and
   publishable key. Restart Vite after changing environment variables.

The seed creates one farm, six rooms, and six camera records. It does not create
profiles, Auth users, rentals, service requests, or payments. Those records are
account-dependent, so the former mock users and their related activity are not
copied. The rooms start available and cameras start offline because no real
rental account or camera stream has been connected.

The migration creates a farmer profile automatically when a new Supabase Auth
user is created. Existing Auth users are backfilled as farmer profiles without
changing their credentials. The app does not create a default administrator or
ship a shared password. To set up the first administrator:

1. In Supabase Dashboard → Authentication → Users, create the administrator's
   real phone-auth user and choose a unique, private password there.
2. Copy that user's Auth UUID and run this in the Supabase SQL editor:

```sql
update public.profiles
set role = 'admin'
where id = '<auth-user-uuid>';
```

3. Sign in to FarmRent with that phone number and password. Profile settings
   allow the signed-in user to update their name, request a verified phone
   change, and change their password after confirming the current password.
   Phone changes require SMS/phone confirmation to be enabled and configured
   for the Supabase project.

Room requests, rental review, and service requests use database functions that
validate the signed-in user and apply row-level security. Payment rows are
read-only to the client; payment status must be updated by a trusted payment
provider integration, which is not configured yet.

The `room_availability` view marks rooms occupied only during an active rental's
current date range. Requests are also checked against date overlaps in the
database, so the same room can be rented again for a later period.

Administrators can add, edit, and delete rooms from the Rooms page, including
uploading room photos. Room images are publicly readable; only administrators
can upload, replace, or delete them. Signed-in users can upload or remove their
own profile picture in Profile settings. Profile pictures are stored privately
and displayed using temporary signed URLs. Both image types accept JPG, PNG,
and WebP files up to 5 MB.

## Local-only setup

`supabase db reset` applies migrations and `supabase/seed.sql` to a local
Supabase instance. Do not use the mock data as real customer or payment data.
