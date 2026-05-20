# Veil — A Space for Your Dreams

An AI-native dream journaling iOS app built with Expo (React Native), Clerk, Supabase, and Kimi LLM.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Expo (React Native, managed workflow) |
| Auth | Clerk (Apple Sign-In + Google OAuth) |
| Database | Supabase (PostgreSQL + Row Level Security) |
| AI | Kimi LLM (Moonshot API, streaming) |
| Navigation | Expo Router v4 |
| Styling | NativeWind v4 + design tokens |

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `KIMI_API_KEY` | Yes (server-side) | Kimi/Moonshot API key — never exposed to client |
| `CLERK_SECRET_KEY` | Yes (server-side) | Clerk secret key for token verification |

## Local Development

```bash
git clone <repo>
cd veil
npm install
cp .env.local.example .env.local  # fill in real values
npx expo start
```

## iOS Build

```bash
# Preview build (internal distribution)
eas build --platform ios --profile preview

# Production build
eas build --platform ios --profile production
```

## Supabase Setup

Run `supabase/migrations/001_dream_records.sql` in the Supabase SQL editor to create the schema and Row Level Security policies.

---

*Dreams are personal echoes. Veil provides reflections, not diagnoses.*
