# Knives Out

A Next.js murder mystery game where players host or join a private investigation, receive suspect identities, collect clues, interrogate suspects, and reveal the killer.

## Development

Run the app:

```bash
npm run dev
```

Run type checking:

```bash
npm run typecheck
```

The app uses Genkit flows under `src/ai/flows` for AI-generated mysteries, suspect interrogation, and the final reveal. The game can also fall back to archived mysteries from `src/app/lib/game-bank.json`.
