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

## Add farmers and enable email-code sign-in

Real farmer accounts are created by an administrator from **Admin → Farmers**.
The administrator enters the farmer's name and email address; the server
creates an email-auth user and sends a one-time sign-in code. Farmers use
**Sign in with an email code** on the login page for their first sign-in and
whenever they need another code. Password sign-in remains available for accounts
that already have a password. Public sign-in does not create accounts.

Before using this workflow:

1. In Supabase Dashboard → Authentication → Sign In / Providers, enable Email
   sign-in. Configure a production SMTP provider and the email OTP template so
   it includes the code variable `{{ .Token }}`. Configure authentication rate
   limits in the Supabase Dashboard.
2. Apply the database migration that adds email addresses to farmer profiles.
3. Deploy the admin-only Edge Function:

   ```sh
   supabase functions deploy create-farmer --project-ref <project-ref>
   ```

   The function uses Supabase's server-side `SUPABASE_SERVICE_ROLE_KEY` to
   verify that the caller is an administrator and create the Auth user. It
   also uses the project URL and anon key to request the initial email code.
   These are supplied to deployed Edge Functions by Supabase; do not add the
   service-role key to `.env.local` or any `VITE_` variable.
4. Ensure the administrator's profile has `role = 'admin'`. Test with an email
   address you control before onboarding a farmer.

An account can be created even if the email provider rejects the initial
message. The Admin → Farmers page reports this separately; the farmer can then
request another code from the email sign-in form after the provider issue is
resolved. Email addresses must be unique in Supabase Auth. If the project is in
mock mode or Supabase is not configured, account creation is disabled and only
temporary local preview accounts are available.

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
