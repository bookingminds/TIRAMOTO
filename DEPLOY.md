# TIRAMOTO - Deployment Guide (Railway + Supabase)

## Architecture

```
GitHub Repo --> Railway (Node.js) --> Supabase (PostgreSQL)
                   |
              Auto-deploy on push to main
```

- **Runtime**: Node.js + Express (server-rendered EJS)
- **Database**: PostgreSQL on Supabase
- **Auth**: Session-based + optional Google OAuth
- **Deploy**: Railway with auto-deploy from GitHub

---

## STEP 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose region closest to Albania (e.g. `eu-central-1` Frankfurt)
3. Set a strong database password — **save it**
4. Wait for the project to finish provisioning

### Get your connection string

1. Go to **Project Settings** > **Database**
2. Under **Connection string** > **URI**, copy the string
3. It looks like: `postgresql://postgres:[PASSWORD]@db.[REF].supabase.co:5432/postgres`
4. Replace `[PASSWORD]` with the password you set

### Run migrations

1. Go to **SQL Editor** in Supabase dashboard
2. Paste the contents of `migrations/001_schema.sql` and run it
3. Paste the contents of `migrations/002_seed.sql` and run it
4. Verify tables: `perdoruesit`, `porosite`, `historiku` are created

---

## STEP 2: Push Code to GitHub

```bash
git init
git add .
git commit -m "TIRAMOTO v1.0 - production ready"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tiramoto.git
git push -u origin main
```

### Create staging branch (optional)

```bash
git checkout -b staging
git push -u origin staging
git checkout main
```

---

## STEP 3: Deploy on Railway

1. Go to [railway.app](https://railway.app) and create a new project
2. Choose **Deploy from GitHub repo**
3. Select your `tiramoto` repository
4. Railway will auto-detect Node.js

### Set Environment Variables

In Railway dashboard > **Variables**, add:

| Variable | Value |
|----------|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `BASE_URL` | `https://your-app.up.railway.app` |
| `DATABASE_URL` | `postgresql://postgres:PASSWORD@db.REF.supabase.co:5432/postgres` |
| `SESSION_SECRET` | (generate a random 64-char string) |
| `GOOGLE_CLIENT_ID` | (from Google Cloud Console, or leave empty) |
| `GOOGLE_CLIENT_SECRET` | (from Google Cloud Console, or leave empty) |

### Configure deploy settings

- **Start command**: `node server.js` (auto-detected from `railway.toml`)
- **Health check**: `/health` (configured in `railway.toml`)
- **Auto-deploy**: Enabled on push to `main`

### Generate a random SESSION_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## STEP 4: Google OAuth (Optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project (or select existing)
3. Go to **APIs & Services** > **Credentials**
4. Create **OAuth 2.0 Client ID** (Web application)
5. Add authorized redirect URI:
   - `https://your-app.up.railway.app/auth/google/callback`
6. Copy Client ID and Client Secret to Railway variables

---

## STEP 5: Verify Deployment

### Health check
```bash
curl https://your-app.up.railway.app/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-03-01T...",
  "uptime": 123.45,
  "env": "production"
}
```

### Test auth
1. Open `https://your-app.up.railway.app/hyr`
2. Login with `admin@tiramoto.al` / `admin123`
3. Verify admin dashboard loads
4. Login with `korrier@tiramoto.al` / `korrier123`
5. Verify courier dashboard loads
6. Register a new customer account
7. Create a test order

### Test Google login (if configured)
1. Click "Hyr me Google" on the login page
2. Complete Google sign-in
3. Verify auto-registration as `klient`

---

## STEP 6: Custom Domain (Optional)

1. In Railway > **Settings** > **Networking**
2. Add custom domain (e.g. `tiramoto.al`)
3. Update DNS:
   - Add CNAME record pointing to Railway
4. Update `BASE_URL` in Railway variables to `https://tiramoto.al`
5. If using Google OAuth, add `https://tiramoto.al/auth/google/callback` to authorized redirect URIs

---

## Environment Summary

### Development (local)
```
NODE_ENV=development
PORT=3000
BASE_URL=http://localhost:3000
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
SESSION_SECRET=dev-secret
```

### Production (Railway)
```
NODE_ENV=production
PORT=3000
BASE_URL=https://your-app.up.railway.app
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
SESSION_SECRET=<random-64-chars>
GOOGLE_CLIENT_ID=<from-google>
GOOGLE_CLIENT_SECRET=<from-google>
```

---

## Production Features

| Feature | Status |
|---------|--------|
| PostgreSQL (Supabase) | Configured |
| Health check `/health` | Configured |
| Request logging (morgan) | Enabled |
| Rate limiting | 200 req/15min (prod) |
| Auth rate limiting | 20 req/15min |
| Helmet security headers | Enabled |
| CORS | Configured |
| Secure cookies | Enabled in prod |
| Trust proxy | Enabled |
| Static asset caching | 7 days in prod |
| Auto-deploy on push | Via Railway |
| Error handling | Global handler |
| SQL injection protection | Parameterized queries |

---

## File Structure

```
TIRAMOTO/
├── config/
│   └── passport.js          # Google OAuth strategy
├── db/
│   └── init.js              # PostgreSQL pool + init
├── middleware/
│   └── auth.js              # Role-based auth
├── migrations/
│   ├── 001_schema.sql       # Database schema
│   └── 002_seed.sql         # Seed data
├── public/
│   ├── css/style.css        # Styles
│   └── img/hero.jpg         # Hero image
├── routes/
│   ├── admin.js             # Admin routes
│   ├── auth.js              # Login/register/OAuth
│   ├── courier.js           # Courier routes
│   └── customer.js          # Customer routes
├── scripts/
│   └── migrate.js           # Migration runner
├── views/                   # EJS templates
├── .env.example             # Env template
├── .gitignore
├── package.json
├── Procfile                 # Heroku/Railway
├── railway.toml             # Railway config
└── server.js                # Entry point
```

---

## Troubleshooting

**"Database unreachable" on /health**
- Check `DATABASE_URL` is correct in Railway variables
- Verify Supabase project is active
- Check if SSL is required (it is in production)

**Google OAuth redirect error**
- Verify `BASE_URL` matches your actual domain
- Verify callback URL in Google Console matches `BASE_URL/auth/google/callback`

**Session not persisting**
- Ensure `SESSION_SECRET` is set
- Ensure `trust proxy` is enabled (it is)
- Check `secure: true` cookie works with HTTPS

**Rate limited**
- Production allows 200 requests per 15 minutes per IP
- Auth endpoints allow 20 attempts per 15 minutes
