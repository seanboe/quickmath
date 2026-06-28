# LaTeX Suite — Online Markdown Editor

A browser-based, split-pane Markdown editor with live preview and **LaTeX math typing
shortcuts** ported from [obsidian-latex-suite](https://github.com/artisticat1/obsidian-latex-suite).

- **Left pane:** a CodeMirror 6 Markdown editor with the LaTeX Suite snippet engine.
- **Right pane:** live HTML preview rendered with `markdown-it` + KaTeX (inline `$…$` and
  display `$$…$$`).
- Your document auto-saves to `localStorage`.
- Top-right controls: **Save .md** (download the source), **Export PDF** (opens the print
  dialog showing only the rendered preview — choose "Save as PDF"), and a **dark-mode**
  toggle (remembered across reloads, defaults to your OS preference).

## Quick start

```bash
npm install
npm run dev      # open the printed http://localhost:5173 URL
npm run build    # production build into dist/
npm run preview  # preview the production build
```

> **Node version:** this project targets **Node 16+** and uses Vite 4 for that reason. It
> works on newer Node too; if you upgrade to Node 18/20 you can bump to Vite 5 if desired.

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds
the site and publishes it to GitHub Pages on every push to `main`/`master`.

One-time setup:

1. Push this repo to GitHub (it can be a project repo; the build uses a relative `base`, so
   it works at `https://<user>.github.io/<repo>/` without extra config):
   ```bash
   git add .
   git commit -m "Prepare for GitHub Pages"
   git remote add origin git@github.com:<user>/<repo>.git
   git push -u origin master   # or main
   ```
2. On GitHub: **Settings → Pages → Build and deployment → Source → "GitHub Actions"**.
3. The workflow runs automatically; the live URL appears in the Actions run summary and on
   the Pages settings screen.

Notes:
- `dist/` and `node_modules/` are git-ignored — the site is built fresh in CI.
- `public/.nojekyll` prevents GitHub from running Jekyll on the output.
- CI builds with Node 20; locally the project targets Node 16 via Vite 4.

## LaTeX typing shortcuts

These fire while the cursor is inside math (`$ … $` or `$$ … $$`):

| Type        | Result                                  |
| ----------- | --------------------------------------- |
| `mk` / `dm` | create inline / display math            |
| `x/`        | auto-fraction → `\frac{x}{}`            |
| `//`        | empty fraction `\frac{}{}`              |
| `sq` `sr`   | `\sqrt{}` / superscript                  |
| `@a`        | `\alpha` (Greek via snippet variables)   |
| **Tab**     | jump between tabstops / out of brackets  |
| matrix env  | **Tab** = `&`, **Enter** = new row       |

The full default snippet set (~200 snippets) and behaviors come from latex-suite.

## Architecture

```
src/
├── main.ts                 # app entry: wires editor → preview + autosave
├── style.css               # split-pane layout + preview styling
├── storage.ts              # localStorage persistence + debounce
├── polyfills.ts            # String/Array.prototype.contains (Obsidian-ism)
├── preview/render.ts       # markdown-it + markdown-it-texmath + KaTeX
└── editor/
    ├── editor.ts           # CodeMirror 6 assembly (markdown + LaTeX Suite)
    ├── theme.ts            # editor theme + tabstop placeholder styling
    └── latex-suite/        # ported obsidian-latex-suite engine (MIT)
        ├── setup.ts        # builds the CM extension bundle from default settings
        ├── utils/context.ts# ★ standalone math-mode detection (see below)
        ├── utils/platform.ts# tiny Platform shim (replaces obsidian's Platform)
        ├── snippets/ features/ editor_extensions/ settings/ …
        └── default_snippets.js, default_snippet_variables.js
```

### Porting notes (Obsidian → standalone)

The engine is ported from obsidian-latex-suite with Obsidian dependencies removed:

- **`utils/context.ts`** is rewritten. Upstream detected math mode by walking Obsidian's
  custom (HyperMD) Markdown syntax tree, which doesn't exist in vanilla CodeMirror. This
  version scans the document for `$`/`$$` delimiters (ignoring escaped `\$`, fenced code,
  and inline code) to determine inline vs. display math and the equation bounds. The
  environment helpers (`isWithinEnvironment`, `inTextEnvironment`) are kept verbatim.
- Obsidian `Platform` → `utils/platform.ts`; `Notice`/`createEl` debug helpers →
  `editor_extensions/obsidian_utils.ts` (plain DOM + console).
- Internal `src/…` imports were rewritten to the `@ls/*` alias (see `vite.config.ts` /
  `tsconfig.json`).
- Default snippet source is loaded via Vite's `?raw` import and evaluated by the engine's
  existing dynamic-import parser.
- **Not ported (v1):** in-editor concealment, inline math hover preview, bracket
  highlighting, the settings UI, and file-based snippet loading.

Upstream obsidian-latex-suite is MIT licensed; attribution is retained in the ported tree.
