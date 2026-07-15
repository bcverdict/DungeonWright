# Dungeon Wright

A D&D dungeon-master screen for running sessions with a second display. You prepare and preview
what the players will see, then publish it to a separate player window when it's ready.

## Running it

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173 — this is the **DM screen**. Click **Open player window** in the top
bar (or open `#/player` in a second tab) and drag that window to the TV/projector/second monitor.
The player window updates live whenever you press **Update player screen**.

## How it works

- **Scenes** (sidebar): upload location/backdrop images. Click one to load it into the preview.
- **Characters** (sidebar): upload character/monster art. Click to place on the preview, or drag
  onto the stage. Drag tokens to move them, scroll (or use the +/− controls) to resize, × to
  remove. A player screen can be a scene alone, characters alone, or a scene with characters.
- **Map** (sidebar): every scene is a node. Drag nodes to arrange them, use *Connect scenes* and
  pick two nodes to link/unlink them, and click a node to jump to that scene. Each node shows
  which characters are currently in that scene, which scene you're previewing (purple), and which
  is live for players (green).
- **Preview vs. live**: the big stage is your working preview. The *Unpublished changes* badge
  appears whenever the preview differs from what players currently see. Press **Update player
  screen** to publish.
- **Undo / redo** (or Cmd/Ctrl+Z, Shift+Cmd/Ctrl+Z): steps through your preview edits before they
  are published.
- **Prev / next screen**: steps through previously published player screens, loading each into
  the preview so you can re-publish it.
- **Notes**: per-scene DM notes, saved automatically.

All data (images included) is stored locally in your browser (localStorage + IndexedDB), so your
campaign persists between sessions on the same machine and browser.
