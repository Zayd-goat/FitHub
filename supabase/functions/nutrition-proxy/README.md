# Nutrition proxy

Authenticated Supabase Edge Function for FatSecret Platform OAuth 2.0. Configure the
FATSECRET_CLIENT_ID and FATSECRET_CLIENT_SECRET server secrets, then deploy nutrition-proxy.
Secrets and provider access tokens stay server-side. Search payloads are transient; FitHub persists
only provider food and serving IDs plus the user's diary snapshot. ZA localization is used only when
the FatSecret account has access to the provider localization feature.
