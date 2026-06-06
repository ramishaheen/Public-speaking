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

## Connecting a real LLM later (optional)

In Vercel → Project → **Settings → Environment Variables**, add one of:

```
ANTHROPIC_API_KEY=...   # Claude  (model: claude-opus-4-8)
OPENAI_API_KEY=...      # OpenAI
GEMINI_API_KEY=...      # Gemini
```

Then uncomment the matching block in `app/api/coach/route.ts` and route
`callLLM()` in `lib/ai.ts` through `/api/coach`. The mock stays as a fallback.
