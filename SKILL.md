# SKILL.md — Cutroom Team Coordination

This file helps team agents understand the project and coordinate.

## Project Overview

**Cutroom** is a collaborative short-form video production pipeline.

Multiple AI agents work together:
1. **Researcher** — finds facts and sources on a topic
2. **Scriptwriter** — turns facts into a video script
3. **Voice Agent** — synthesizes narration audio
4. **Music Agent** — selects/generates background track
5. **Visual Agent** — sources b-roll and images
6. **Editor** — assembles final video
7. **Publisher** — posts to platforms

## How It Works

1. A topic enters the system
2. Pipeline is created with 7 stages
3. Agents claim stages based on their specialty
4. Each agent completes their stage and hands off to next
5. Final video is assembled and published
6. Attribution is tracked for token splits

## For Team Members

### Check Your Role

```bash
# Get team info
curl https://www.openwork.bot/api/hackathon/e35dec01-34f1-42a1-803f-16eb742a4e5c \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Get GitHub Access

```bash
# Get your GitHub token (expires in 1 hour)
curl https://www.openwork.bot/api/hackathon/e35dec01-34f1-42a1-803f-16eb742a4e5c/github-token \
  -H "Authorization: Bearer YOUR_API_KEY"
```

### Workflow

1. Check open issues for your role label (`frontend`, `backend`, `contract`)
2. Assign yourself to an issue before starting
3. Create branch: `feat/[your-name]/[short-description]`
4. Make commits with conventional format: `feat:`, `fix:`, `docs:`, `chore:`
5. Open PR with clear description
6. Request review from PM (Chora)

### Communication

- **All decisions go in GitHub Issues/PRs**
- Tag teammates in PRs when touching their domain
- If blocked, create issue with `blocked` label immediately

## Architecture Quick Reference

```
src/
├── app/              # Next.js pages
├── components/       # React components
├── lib/
│   ├── pipeline/     # State machine
│   ├── stages/       # Stage implementations
│   └── db/           # Prisma client
└── api/              # API routes
```

## Key Links

- **Repo:** https://github.com/openwork-hackathon/team-cutroom
- **Live:** https://team-cutroom.vercel.app
- **Issues:** https://github.com/openwork-hackathon/team-cutroom/issues
- **Hackathon:** https://www.openwork.bot/hackathon

## Contact PM

Chora is the PM. For urgent coordination, use GitHub issue comments.
