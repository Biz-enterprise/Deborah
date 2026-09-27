# Deborah's 18th — Birthday Experience

A small interactive 3D birthday site built with HTML, CSS, JavaScript, Three.js and GSAP.
Fully static — no backend, no build step, no API keys.

## File structure

```
deborah-birthday/
├── index.html     ← page structure, all scene text lives here
├── style.css      ← all colors, fonts, layout, animation styling
├── script.js      ← Three.js scene, age gate, interactions, sound
└── README.md      ← this file
```

## Deploying to GitHub Pages

1. Create a new repository on GitHub (e.g. `deborah-birthday`).
2. Upload `index.html`, `style.css`, and `script.js` to the root of the repository
   (drag-and-drop on the GitHub website works fine — no command line needed).
3. Go to the repo's **Settings → Pages**.
4. Under "Build and deployment", set **Source** to "Deploy from a branch".
5. Set **Branch** to `main` (or whichever branch you uploaded to) and folder to `/ (root)`.
6. Save. GitHub will give you a link that looks like:
   `https://yourusername.github.io/deborah-birthday/`
7. Wait a minute or two for it to go live, then open the link to test it yourself
   before sending it to her.

No environment variables, no server, no database — everything runs in the browser.

## Where to change things later

**Name and unlock age** — top of `script.js`:
```js
const CONFIG = {
  name: "Deborah",
  correctAge: 18,
  wrongAnswerMessages: [ ... ]
};
```

**All written messages** (appreciation text, cake lines, heartfelt message, finale
text) — open `index.html` and edit the text directly inside each `<section class="scene" ...>`
block. Every scene is clearly commented and labeled.

**Colors** — top of `style.css`, inside the `:root { ... }` block:
```css
--navy, --navy-2, --purple, --lavender, --gold, --warm
```
Change any hex value and it updates across the whole site (backgrounds, glows,
buttons, cards, cake candles).

**Fonts** — the `<link>` tags in the `<head>` of `index.html` pull in Fraunces
(display/heading font) and Outfit (body font) from Google Fonts. Swap the
font names there and in the `--font-display` / `--font-body` variables in
`style.css` to change typography.

## What was checked before delivery

- No console errors on load (Three.js and GSAP load from CDN, all element IDs
  referenced in `script.js` exist in `index.html`)
- Age gate: wrong answers cycle through playful messages with unlimited attempts;
  correct answer (18) triggers the unlock sequence and moves to the main experience
- All "Keep going" / "Continue" buttons transition between scenes correctly
- Trait cards flip on tap/click and show their message
- Cake candles are individually tappable (via raycasting) and extinguish with
  smoke + particles; the scene advances once all candles are out
- The finale forms "DEBORAH" out of a particle constellation, then reveals the
  closing lines
- Replay button reloads the page, restarting from the age gate
- Particle counts and pixel ratio automatically scale down on mobile/lower-power
  devices for performance
- Sound is off by default; the toggle button enables a subtle ambient hum and
  small effect sounds (all synthesized in-browser — no external audio files,
  nothing autoplays)
