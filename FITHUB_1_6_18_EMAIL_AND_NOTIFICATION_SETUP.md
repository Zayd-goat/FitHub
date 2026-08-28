# FitHub 1.6.18 Email and Notification Setup

Use this guide after uploading the 1.6.18 source and running its additive SQL migration.

## Part A — Make confirmation and reset emails deliver

### Why the emails currently fail

Supabase's built-in email sender is a limited test service. Current Supabase documentation says that, without Custom SMTP, Auth mail is restricted to pre-authorized organization-team addresses. Configure Custom SMTP before testing ordinary user addresses.

Official reference: https://supabase.com/docs/guides/auth/auth-smtp

### 1. Enable email confirmation

1. Open the FitHub project in Supabase.
2. Open **Authentication**.
3. Open **Providers** or **Sign In / Providers**.
4. Open **Email**.
5. Keep Email enabled.
6. Turn on **Confirm email**.
7. Save.

### 2. Add both mobile redirect URLs

1. Open **Authentication → URL Configuration**.
2. Keep the existing Site URL.
3. Add these as additional allowed redirect URLs:

```text
fithub://auth-confirmed
fithub://reset-password
```

4. Save.

Official reference: https://supabase.com/docs/guides/auth/redirect-urls

### 3. Configure Custom SMTP

1. Open **Authentication → SMTP Settings**.
2. Enable Custom SMTP.
3. Obtain these values from the email provider you control:

```text
Sender email
Sender name
SMTP host
SMTP port
SMTP username
SMTP password
```

4. Enter the provider's exact values.
5. Verify the sender/domain with that provider if required.
6. Save.
7. Keep the SMTP password in Supabase only. Never put it in GitHub, `.env.example`, the APK, or this chat.

### 4. Install the two templates

For **Confirm signup**:

- Subject: `Confirm your FitHub account`
- Body: copy all of `supabase/confirmation-email.html`

For **Reset password** or **Recovery**:

- Subject: `Reset your FitHub password`
- Body: copy all of `supabase/password-recovery-email.html`

Do not remove `{{ .ConfirmationURL }}` from either template. Disable email click tracking/link rewriting in the SMTP provider because rewritten authentication links can fail.

Official reference: https://supabase.com/docs/guides/auth/auth-email-templates

### 5. Test email safely

1. Install the successful 1.6.18 APK first.
2. Create an account with a genuinely new email address.
3. Open the newest confirmation email on the Android phone.
4. Tap the confirmation button and confirm FitHub opens.
5. Sign out, tap **Forgot password?**, and request a reset for the same account.
6. Open the newest reset email and choose a new password in FitHub.
7. Try signup again with the same email. Supabase Auth keeps one login per email; FitHub shows the safe confirmation/account-recovery screen instead of exposing account lookup details.

For privacy, password reset always shows a generic success message and does not reveal whether an email is registered.

## Part B — Make Android gym-invite pushes deliver

There are two different Firebase JSON files:

- `google-services.json`: public Android app configuration used during the APK build.
- A Firebase service-account JSON: private FCM V1 credential uploaded to Expo/EAS. Never upload it to GitHub.

Both must come from the same Firebase project and Android application `com.fithub.app`.

Official reference: https://docs.expo.dev/push-notifications/fcm-credentials/

### 1. Confirm the Expo project

Repository variable:

```text
EXPO_PUBLIC_EXPO_PROJECT_ID
```

Value:

```text
3d3a3683-79bb-4711-ae01-1dab82cc21e7
```

This is a public project UUID, not a password.

### 2. Confirm the FCM V1 service credential in Expo

In the FitHub Expo project:

1. Open **Credentials**.
2. Open Android application identifier `com.fithub.app`.
3. Under **Service credentials**, confirm an **FCM V1 service account key** is assigned.
4. Do not upload an Android keystore when the page is asking only for the FCM service key.
5. Never commit the private service-account JSON.

### 3. Download `google-services.json`

1. Open the same Firebase project used for the FCM V1 key.
2. Open **Project settings → General**.
3. Under **Your apps**, open or add the Android app with package name:

```text
com.fithub.app
```

4. Download `google-services.json`.
5. Do not rename or edit its contents.

### 4. Convert it to the GitHub secret on Windows

Open PowerShell in the folder containing the downloaded file and run:

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes((Resolve-Path .\google-services.json))) | Set-Clipboard
```

Then immediately open GitHub:

1. **Repository → Settings → Secrets and variables → Actions**.
2. Open **Secrets**.
3. Click **New repository secret**.
4. Name it exactly:

```text
GOOGLE_SERVICES_JSON_BASE64
```

5. Paste into **Secret** and save.

The value is a long block of letters, numbers, `/`, `+`, and sometimes `=`. It is not just a project number.

### 5. Confirm the other GitHub values

Repository secrets:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY
GOOGLE_SERVICES_JSON_BASE64
```

Repository variable:

```text
EXPO_PUBLIC_EXPO_PROJECT_ID
```

Optional repository variable:

```text
EXPO_PUBLIC_FITHUB_DOWNLOAD_URL
```

Never use the Supabase service-role key as the mobile publishable key.

### 6. Deploy the updated notification worker

Generate a new long random cron secret locally and keep it private. In PowerShell, one safe generator is:

```powershell
-join ((48..57)+(65..90)+(97..122) | Get-Random -Count 48 | ForEach-Object {[char]$_})
```

From the extracted FitHub project folder, use Supabase CLI locally:

```text
npx supabase login
npx supabase secrets set FRIEND_NOTIFICATION_CRON_SECRET=YOUR_LONG_RANDOM_VALUE --project-ref YOUR_PROJECT_REF
npx supabase functions deploy friend-notifications --project-ref YOUR_PROJECT_REF --no-verify-jwt
```

Replace `YOUR_PROJECT_REF` with the short reference at the start of the Supabase project URL. Paste tokens and secrets only into your own terminal or dashboards—never into chat or GitHub source.

The function intentionally disables gateway JWT verification because the cron job uses the private `x-cron-secret` header and the function validates that header itself.

Official references:

- https://supabase.com/docs/guides/functions/deploy
- https://supabase.com/docs/guides/functions/auth-headers

### 7. Create or update one cron job

In Supabase Cron, create one job—do not duplicate an existing FitHub notification job—with:

```text
Schedule: * * * * *
Method: POST
URL: https://YOUR_PROJECT_REF.supabase.co/functions/v1/friend-notifications
Header: Content-Type = application/json
Header: x-cron-secret = YOUR_LONG_RANDOM_VALUE
Body: {}
```

Official scheduling reference: https://supabase.com/docs/guides/functions/schedule-functions

### 8. Physical-device test

1. Build and install the successful 1.6.18 APK.
2. Allow notifications when Android asks.
3. Sign into User A and User B on two physical Android devices.
4. Keep both accounts signed in long enough for push-token registration.
5. User A sends User B a future gym invite.
6. Confirm User B sees both:
   - an Android notification with Accept/Decline actions; and
   - the same invite in FitHub's notification center.
7. Tap or act on the notification and confirm it disappears from the unread list.
8. If it fails, check the Edge Function logs. Version 1.6.18 records the last push error and disables `DeviceNotRegistered` tokens so the next app sign-in can register a fresh token.
