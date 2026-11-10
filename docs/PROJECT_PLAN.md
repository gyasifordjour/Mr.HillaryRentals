# FarmRent: Pig Housing Rental and Monitoring Platform

Copy of the planning document goes here. See the original project description.

## Stack
- React + TypeScript + Tailwind (Netlify)
- Supabase (Auth, Postgres + RLS, Edge Functions, Storage, Cron)
- MediaMTX on a VPS for CCTV (WebRTC)
- Paystack payments, Ghanaian SMS provider for OTP

## Folder guide
- `src/pages` route screens (auth, farmer, admin)
- `src/features` domain logic per area (auth, rooms, rentals, cameras, payments, notifications)
- `src/components` shared UI, layout, CCTV player
- `src/mock` mock data shaped like the planned tables
- `supabase/migrations` SQL schema and RLS policies
- `supabase/functions` secure backend functions
- `streaming` MediaMTX config
