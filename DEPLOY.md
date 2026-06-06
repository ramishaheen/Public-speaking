# Deploy to Vercel (2 minutes, free, permanent URL)

The app is a standard Next.js project and needs **no environment variables** to run
(the AI engine runs in mock mode until you wire a provider — see `README.md`).

## One-time import

1. Open **https://vercel.com/new** in your browser and sign in with GitHub.
2. Click **Import** next to the **`ramishaheen/Public-speaking`** repository.
   - If you don't see it, click **Adjust GitHub App Permissions** and grant access to the repo.
3. On the configure screen:
   - **Framework Preset:** Next.js (auto-detected)
   - **Branch:** select **`claude/etihad-speaking-room-trainer-3NFHb`**
     (or merge the PR to `main` first and deploy `main`)
   - **Build / Install / Output:** leave as defaults (also defined in `vercel.json`)
   - **Environment Variables:** none required
4. Click **Deploy**. After ~1–2 minutes you get a permanent URL like
   `https://public-speaking-xxxx.vercel.app`.

## After it's live

- Every push to the connected branch redeploys automatically.
- Preview deployments are created for each PR.

## Turning on the Gemini AI coach (when your key is ready)

The app runs fine with **no key** (built-in mock coach). To switch the plan and
practice evaluation to **real Gemini**, no code change is needed — just add the key:

1. Get a key from **https://aistudio.google.com/app/apikey**.
2. In Vercel → your project → **Settings → Environment Variables**, add:

   ```
   GEMINI_API_KEY = your_key_here
   ```
   (Optional) pin a model with `GEMINI_MODEL = gemini-2.5-flash` (the default).

3. **Redeploy** (Deployments → ⋯ → Redeploy, or push any commit).

Once the key is present:
- The Practice Room badge flips from `AI_ENGINE: [MOCK]` to `[GEMINI]`.
- The personalized plan is rebuilt by Gemini from **all** onboarding answers and
  **tailored to the selected role model's speaking style**.
- Practice responses (typed or voice-transcribed) are evaluated by Gemini.
- If the key is ever invalid or the API is down, the app silently falls back to
  the mock coach — it never breaks.

The key stays server-side (used only in the `/api/llm` route); it is never exposed
to the browser.

