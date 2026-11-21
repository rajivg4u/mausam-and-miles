# Mausam & Miles — Supabase authentication deployment

## 1. Install and configure

- Run `npm install` with Node.js 20+.
- Create a Supabase project.
- Open **SQL Editor**, run `supabase/schema.sql` once (on a fresh database).
- Copy `.env.example` to `.env.local`, fill the Supabase URL and public anon/publishable key.
- Never commit `.env.local` or use a service-role key in NEXT_PUBLIC variables.

## 2. Configure email OTP — CRITICAL

Supabase Dashboard > Authentication > Providers > Email:
- Enable Email provider.
- Enable **Confirm email**. Signup confirmation must be required.
- Set **Email OTP expiration** to **600 seconds (10 minutes)** in Auth email settings.
- Use a verified SMTP provider for production. Supabase default SMTP has delivery limits and is not suitable for general production use.

Dashboard > Authentication > Email Templates:
- **Confirm signup** template must contain `{{ .Token }}` as the six-digit code, rather than a confirmation link.
- **Magic Link** template must contain `{{ .Token }}` as the six-digit login code, rather than a link.
- For both templates, include the email/code in friendly copy; do not accidentally leave the default `{{ .ConfirmationURL }}` link as the only method.
- For password reset, retain the recovery link template.

Dashboard > Authentication > URL Configuration:
- Set Site URL to your deployed domain.
- Add `http://localhost:3000/**` and `https://YOUR-VERCEL-DOMAIN/**` as allowed redirect URLs.

**Important:** OTP expiry is controlled by Supabase, not a JavaScript timer. This code does not falsely claim to change the expiry in the client.

## 3. How authentication works

- Signup collects first name, last name, email, password and multiple travel preferences.
- `signUp` stores the password hash with Supabase Auth, and the database trigger creates the profile and preference records.
- Signup email OTP is verified using `verifyOtp({ type: 'signup' })`.
- Returning users sign in with `signInWithOtp({ shouldCreateUser:false })` and `verifyOtp({ type:'email' })`.
- Supabase handles token generation, verification, expiration and session cookies. No custom OTP table or plaintext password storage is needed.
- Dashboard route `/` is protected by middleware. Weather and places APIs remain public to avoid disrupting existing functionality.
- Existing saved places remain in browser localStorage; the `saved_places` table is provisioned for a later sync migration.

## 4. Deploy to Vercel

- Push project to GitHub.
- Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Project Settings > Environment Variables for Production and Preview as needed.
- Redeploy. Test signup, expired OTP after 10 minutes, resend, OTP-only login, sign-out and mobile layouts.

## 5. Notes / limitations

- Email OTP login is **passwordless** after signup, not password + OTP MFA.
- Supabase email resend throttling is controlled by Supabase Auth settings; set sensible limits and use CAPTCHA for production abuse protection.
- Supabase may accept previously issued codes until expiration depending on provider behavior; do not claim that resend always invalidates older codes without testing your project configuration.
- Password recovery uses Supabase's email recovery link and the `/reset-password` page. If your Supabase recovery link redirects with PKCE code rather than an implicit session, add the documented auth callback flow for that configuration.
- User preferences are stored at signup; recommendation ranking is not yet personalized by those preferences because the existing Overpass place categories do not directly map to all interests. A future enrichment/mapping layer is required.
