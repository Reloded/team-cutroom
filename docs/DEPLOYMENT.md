# Deployment Guide

This guide covers deploying Cutroom to Vercel.

## Prerequisites

- Node.js 18+
- pnpm
- Vercel account
- API keys for external services

## Quick Start (Vercel)

The project auto-deploys on push to `main`. Vercel is pre-configured via the hackathon.

### 1. Set Environment Variables

In the Vercel dashboard → Settings → Environment Variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | ✅ | Vercel Postgres connection string |
| `OPENAI_API_KEY` | ✅ | For script generation |
| `ELEVENLABS_API_KEY` | ✅ | For voice synthesis |
| `PEXELS_API_KEY` | ✅ | For stock footage |
| `BLOB_READ_WRITE_TOKEN` | ✅ | For asset storage |
| `BASE_RPC_URL` | ⚪ | Default: https://mainnet.base.org |
| `WALLET_PRIVATE_KEY` | ⚪ | For token treasury operations |
| `NEXT_PUBLIC_CUTROOM_TOKEN_ADDRESS` | ⚪ | Set after token deployment |

### 2. Database Setup

Vercel Postgres is recommended:

1. Go to Vercel Dashboard → Storage → Create Database
2. Select "Postgres"
3. Copy the connection string to `DATABASE_URL`
4. Run migrations:
   ```bash
   npx prisma db push
   ```

### 3. Deploy

Push to `main` → Vercel auto-deploys.

Or manually:
```bash
vercel --prod
```

### 4. Verify

Check the health endpoint:
```bash
curl https://team-cutroom.vercel.app/api/health
# → {"status":"ok","timestamp":"..."}
```

## Local Development

```bash
# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env.local
# Edit .env.local with your values

# Push database schema
pnpm db:push

# Run dev server
pnpm dev
```

## API Keys

### OpenAI
1. Go to https://platform.openai.com/api-keys
2. Create a new API key
3. Add to `OPENAI_API_KEY`

### ElevenLabs
1. Go to https://elevenlabs.io/
2. Sign up and go to Profile → API Keys
3. Create a key, add to `ELEVENLABS_API_KEY`
4. Find a voice ID at https://elevenlabs.io/voices
5. Add to `ELEVENLABS_VOICE_ID`

### Pexels
1. Go to https://www.pexels.com/api/
2. Sign up and get an API key
3. Add to `PEXELS_API_KEY`

### Vercel Blob
1. In Vercel Dashboard → Storage → Create
2. Select "Blob"
3. Copy the read-write token to `BLOB_READ_WRITE_TOKEN`

## Token Deployment

See the main README for token deployment instructions.

## Troubleshooting

### Database Connection Failed
- Check `DATABASE_URL` format
- Ensure Vercel Postgres is provisioned
- Run `npx prisma db push` to sync schema

### Build Fails
- Check for TypeScript errors: `pnpm typecheck`
- Check for lint errors: `pnpm lint`
- Run tests: `pnpm test`

### API Routes Return 500
- Check environment variables are set
- Check Vercel logs for error details
- Verify database connection

## Architecture

```
Vercel
├── Next.js App (Edge Functions)
│   ├── /api/pipelines/      → Pipeline CRUD
│   ├── /api/stages/         → Stage operations
│   └── /api/webhooks/       → External integrations
├── Vercel Postgres          → Pipeline & stage data
├── Vercel Blob              → Generated assets
└── Edge Config (optional)   → Feature flags
```

## Security Notes

- Never commit `.env.local` or any file with secrets
- Use Vercel's encrypted environment variables for sensitive keys
- The `WALLET_PRIVATE_KEY` should only be set in production for treasury operations
- API routes validate input; don't bypass validation
