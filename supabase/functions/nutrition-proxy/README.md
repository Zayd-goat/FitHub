# Nutrition proxy

Authenticated Supabase Edge Function for FatSecret Platform OAuth 2.0. Configure
`FATSECRET_CLIENT_ID` and `FATSECRET_CLIENT_SECRET`, then deploy `nutrition-proxy`.

Set `FATSECRET_SCOPES` to the scopes enabled for the FatSecret account. `basic` works with the
automatic basic-search fallback. Accounts with the applicable products can use:

`basic premier barcode localization`

The function requests up to 50 results per page and the app exposes **Load more results**, so search
is no longer limited to the first 25 entries. FatSecret v5 is used when `premier` is enabled; otherwise
the compatible basic search endpoint is used. ZA/en localization parameters are sent only when the
`localization` scope is configured.

Secrets and provider access tokens stay server-side. Search payloads are transient; FitHub persists
only provider food/serving IDs and the user's selected diary snapshot.
