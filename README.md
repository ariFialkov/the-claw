# The Claw

A 3D arcade claw-machine betting game for mobile and desktop, installable as a PWA.
Built with Vite + three.js. All models, textures and sounds are generated in code — there are no binary game assets.

## Run

```bash
npm install
npm run dev        # local dev server
npm run build      # production build in dist/ (static, host anywhere over HTTPS)
npm run simulate   # Monte-Carlo check of the paytable, e.g. `npm run simulate -- 0.92 5000000`
```

## How a round works

1. Player taps anywhere: the stake is taken and `engine.playRound(stake)` draws the result from the paytable with one RNG call.
2. The machine rumbles and the prize heap churns into the layout for that result.
3. The player steers the claw (joystick / WASD / arrows) and presses GRAB (or Space) before the 10 s timer ends; when it ends the claw drops where it is.
4. The client animates the already-decided result: on a winning round the claw settles on the nearest copy of the awarded prize and drops it down the trough, then the camera cuts to the prize bay for the tier-coloured win card; on a losing round the grabbed prize slips.

Claw position never changes the payout. The in-game info panel says so and shows the RTP and odds.

## Where things live

| File | Purpose |
| --- | --- |
| `src/engine.js` | Outcome engine: paytable, RTP → probabilities, `playRound`. Pure, no DOM. Move server-side for real-money use. |
| `src/main.js` | Scene setup, round flow, input, HUD, win presentation. |
| `src/machine.js` | Cabinet, lights, gantry and claw. |
| `src/room.js` | Arcade room backdrop: wall, carpet, muted neighbouring machines. |
| `src/items.js` | The 28 procedural prize models. |
| `src/vfx.js` | Sprite particles, glow, confetti, coins. |
| `src/audio.js` | WebAudio synthesised sound effects. |
| `public/` | PWA manifest, service worker, icons. |

## RTP

Default target RTP is 95% (`DEFAULT_RTP` in `src/engine.js`). The paytable weights fix the *shape* of the prize distribution;
the hit rate is derived from the target RTP, so changing the RTP changes how often a round pays, not what the prizes are worth.

- `?rtp=0.92` overrides it for a session.
- `?operator` shows an RTP slider in the info panel (persisted in localStorage).
- In dev builds, `window.__claw.force('ring')` forces the next result (or `null` for a loss) to preview a win sequence.
