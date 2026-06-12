# Account Command Center (web app)

Your enterprise account planning tool, rebuilt as a private website you can log into from any device. Same five surfaces as before: Sector Playbooks, Stakeholder Map, Target Board, Strategy Engine, and a synced Pipeline.

## What runs where

- **GitHub**: holds the code.
- **Vercel**: hosts the site and runs the small server functions (login, AI call, pipeline).
- **Supabase**: stores your saved pipeline so it syncs across devices.
- **Anthropic (Claude)**: powers the Strategy Engine, using your API key.

Your Claude key and Supabase key live only on the server (Vercel environment variables). They never reach the browser.

## One-time setup (about 15 minutes)

### 1. Create the Supabase table
In your Supabase project, open the SQL editor and run this once:

```sql
create table if not exists app_kv (
  key text primary key,
  value text,
  updated_at timestamptz default now()
);
```

Then go to Settings -> API and copy two things: the **Project URL** and the **service_role** key (the secret one, not the anon key).

### 2. Get your Claude API key
At console.anthropic.com, open **API keys** and create a key. Copy it. (You already have credit on this account.)

### 3. Put the code on GitHub
Create a new, **private** repo and push this folder to it. If you use the GitHub Desktop app: add this folder, commit, publish as a private repo.

### 4. Deploy on Vercel
- In Vercel, click **Add New -> Project** and import the GitHub repo.
- Vercel detects Vite automatically. Leave the build settings as-is.
- Before deploying, open **Environment Variables** and add these five:

| Name | Value |
|---|---|
| `APP_PASSWORD` | the password you want to type to get in |
| `ANTHROPIC_API_KEY` | your Claude key from step 2 |
| `SUPABASE_URL` | the Project URL from step 1 |
| `SUPABASE_SERVICE_ROLE_KEY` | the service_role key from step 1 |
| `ANTHROPIC_MODEL` | optional, leave out to use the default |

- Click **Deploy**. When it finishes, Vercel gives you a URL.

### 5. Use it
Open the URL on your laptop or phone, type your password, and you are in. Saved strategies appear on every device because they live in Supabase.

## Changing your password later
Edit `APP_PASSWORD` in Vercel's Environment Variables and redeploy. Everyone is logged out and the new password takes effect.

## Running it on your own computer first (optional)
If you want to test locally before deploying, install Node, then in this folder run `npm install` and `npm run dev`. Note: the login, AI, and pipeline functions only run on Vercel, so local mode is mainly for checking the look.

## Security note
This uses one shared password, which is right for a private personal tool. It is not built for multiple separate user accounts. The password gate plus the keys staying server-side keeps the tool and your API costs private.
