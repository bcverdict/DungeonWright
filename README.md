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

- **Campaigns**: the dropdown at the top of the sidebar switches between projects — each campaign
  or one-shot keeps its own scenes, characters, map, notes, music, and player-screen history. Use
  the +, ✎, and × buttons beside it to create, rename, or delete campaigns. Switching campaigns
  also updates the player window to that campaign's last published screen.
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
- **Music** (sidebar): save YouTube links with a title and a note about when to play them
  (e.g. Title: "Intense", Note: "Play this when they spring the trap"). Attach tracks to the
  scene you're currently previewing; when you travel to a scene (via the map or the Scenes tab),
  its attached music appears on the DM screen with the notes, one click from opening in YouTube.
- **Notes**: per-scene DM notes, saved automatically.
- **Ability cards** (top bar): edit and print the homebrew abilities as 5in × 3in flashcards.
  Each card has art (bundled with the app in `src/assets/abilities`), a title, flavor text, and a
  description. The card is shown at true physical size, so printing gives you exact 5×3 cards to
  cut out. Card text is saved automatically and included in file backups.

All data (images included) is stored locally in your browser (localStorage + IndexedDB), so your
campaign persists between sessions on the same machine and browser.
