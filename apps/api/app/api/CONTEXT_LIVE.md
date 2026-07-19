# Live Context API

All endpoints require a Supabase access token in `Authorization: Bearer <token>`.

`POST /context/live` receives browser coordinates and writes the user's one active `user_context` row. The body is `{ latitude, longitude, city?, state?, country?, timezone?, fallback? }`; browser collection sends empty place names and the API resolves them through OpenWeather. The browser IANA timezone is used for the returned local date and time. A permission fallback sends Delhi and `fallback: true`.

`GET /context/live` returns the most recently collected snapshot. It never calls the recommendation or existing Context Engine. `POST /context/live` returns HTTP 200 for partial context: weather is `null` with `warning: "OPENWEATHER_API_KEY missing"` when no key or cache is available, calendar failures return `events: []`, and a missing festival returns `festival: null`. Missing browser coordinates fall back to Delhi with `location.locationFallback: true`. Persistence failures are logged but do not prevent the live response.

Apply `database/migrations/007_user_context.sql` before enabling persistence. The service checks for `public.user_context` and logs a migration-specific error if it is absent.

Required server environment: `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `OPENWEATHER_API_KEY`. `/context/live` passes the frontend Bearer token to Supabase Auth through the official Python client (`auth.get_user(token)`); it does not decode JWTs or require a JWT secret. Invalid, expired, or unverifiable tokens return `401 Unauthorized`.
