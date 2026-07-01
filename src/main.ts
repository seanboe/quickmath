import "./polyfills";
import "katex/dist/katex.min.css";
import "./style.css";

import { EditorView } from "@codemirror/view";
import { createEditor, setEditorTheme } from "./editor/editor";
import {
	FAMILIES,
	themeKey,
	type ThemeFamily,
	type ThemeMode,
} from "./editor/theme";
import { renderMarkdown } from "./preview/render";
import { initMathActions } from "./preview/math-actions";
import { copyAsyncText, copyToClipboard } from "./clipboard";
import { buildShareUrl, decodeDoc, getSharedPayload } from "./share";
import { loadDoc, saveDoc, debounce } from "./storage";

const DEMO_DOC = `# Quick Math

**Quick Math** is an online Markdown editor with live preview and fast LaTeX math typing —
based on [obsidian-latex-suite](https://github.com/artisticat1/obsidian-latex-suite), so it
uses the same snippet shortcuts.

Type Markdown on the left; it renders live on the right.

## Try it

Inline math: the famous identity is $e^{i\\pi} + 1 = 0$.

Display math:

$$
\\int_0^\\infty e^{-x^2}\\,dx = \\frac{\\sqrt{\\pi}}{2}
$$

## Shortcuts to try (inside \`$ … $\` or \`$$ … $$\`)

- \`mk\` → inline math, \`dm\` → display math block
- \`x/\` → auto-fraction \`\\frac{x}{}\`, \`//\` → empty fraction
- \`sqx\` → \`\\sqrt{x}\`, \`sr\` → superscript, \`@a\` → \`\\alpha\`
- inside a matrix, **Tab** inserts \`&\` and **Enter** a new row
- **Tab** jumps between snippet tabstops and out of brackets
`;

const editorParent = document.getElementById("editor")!;
const preview = document.getElementById("preview")!;
const previewPane = document.querySelector(".pane-preview") as HTMLElement;
const exportBtn = document.getElementById("btn-export") as HTMLButtonElement;
const exportMenu = document.getElementById("export-menu") as HTMLElement;
const copyBtn = document.getElementById("btn-copy") as HTMLButtonElement;
const shareBtn = document.getElementById("btn-share") as HTMLButtonElement;
const themeBtn = document.getElementById("btn-theme") as HTMLButtonElement;
const themeMenu = document.getElementById("theme-menu") as HTMLElement;
const modeBtn = document.getElementById("btn-mode") as HTMLButtonElement;
const syncBtn = document.getElementById("btn-sync") as HTMLButtonElement;
const resetBtn = document.getElementById("btn-reset") as HTMLButtonElement;

// Editor handle, declared early so applyTheme can reach it once it exists.
let view: EditorView | undefined;

// ---- Color theme (family × light/dark mode) ----
const LEGACY_THEME_KEY = "latex-suite-web:theme";
const FAMILY_KEY = "quickmath:theme-family";
const MODE_KEY = "quickmath:theme-mode";
const FAMILY_NAMES = FAMILIES.map((f) => f.name);

function getInitialTheme(): { family: ThemeFamily; mode: ThemeMode } {
	const f = localStorage.getItem(FAMILY_KEY) as ThemeFamily | null;
	const m = localStorage.getItem(MODE_KEY) as ThemeMode | null;
	if (f && FAMILY_NAMES.includes(f) && (m === "light" || m === "dark")) {
		return { family: f, mode: m };
	}
	// Migrate from the older single-theme setting, if present.
	const legacy = localStorage.getItem(LEGACY_THEME_KEY);
	if (legacy === "light") return { family: "default", mode: "light" };
	if (legacy === "dark") return { family: "default", mode: "dark" };
	if (legacy === "ayu") return { family: "ayu", mode: "dark" };
	if (legacy === "dracula") return { family: "dracula", mode: "dark" };
	if (legacy === "catppuccin") return { family: "catppuccin", mode: "dark" };
	const prefersDark =
		window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
	return { family: "default", mode: prefersDark ? "dark" : "light" };
}

let { family, mode } = getInitialTheme();

// Build the theme menu (color families) from the FAMILIES list.
for (const { name, label } of FAMILIES) {
	const item = document.createElement("button");
	item.type = "button";
	item.className = "dropdown-item";
	item.setAttribute("role", "menuitemradio");
	item.dataset.family = name;
	item.textContent = label;
	themeMenu.appendChild(item);
}

function applyTheme() {
	const key = themeKey(family, mode);
	document.body.dataset.theme = key;
	if (view) setEditorTheme(view, key);
	for (const item of Array.from(themeMenu.children) as HTMLElement[]) {
		item.classList.toggle("active", item.dataset.family === family);
	}
	// The mode button shows the icon for the mode you'd switch TO.
	modeBtn.textContent = mode === "dark" ? "☀️" : "🌙";
	modeBtn.title =
		mode === "dark" ? "Switch to light mode" : "Switch to dark mode";
}
applyTheme();

// ---- Editor + preview ----
const render = (doc: string) => {
	preview.innerHTML = renderMarkdown(doc);
};
const scheduleRender = debounce(render, 80);
const scheduleSave = debounce(saveDoc, 300);

const initialDoc = loadDoc() ?? DEMO_DOC;
let currentDoc = initialDoc;
render(initialDoc);

// Right-click actions (copy LaTeX / save SVG) on rendered math blocks.
initMathActions(preview);

// ---- Synchronized scrolling ----
const SYNC_KEY = "latex-suite-web:sync";
// Synchronized scrolling is on by default (unless explicitly turned off).
let syncEnabled = localStorage.getItem(SYNC_KEY) !== "off";
let editorScroller: HTMLElement | null = null;

// Only the pane the user is actively interacting with ("leader") drives the
// other. The follower's resulting scroll events are ignored, which avoids the
// feedback loop / rounding drift that otherwise makes a stopped scroll creep.
let leader: HTMLElement | null = null;
let syncCleanup: (() => void) | null = null;

/** Drive `target`'s scroll position to match `source`'s scroll fraction. */
function syncFrom(source: HTMLElement, target: HTMLElement) {
	const sMax = source.scrollHeight - source.clientHeight;
	const tMax = target.scrollHeight - target.clientHeight;
	target.scrollTop = sMax <= 0 ? 0 : (source.scrollTop / sMax) * tMax;
}

function enableSync() {
	if (!editorScroller || syncCleanup) return;
	const ed = editorScroller;

	const markEditor = () => (leader = ed);
	const markPreview = () => (leader = previewPane);
	// User-intent events that establish which pane is leading.
	const intents = [
		"wheel",
		"touchstart",
		"pointerdown",
		"keydown",
		"mouseenter",
	] as const;
	for (const ev of intents) {
		ed.addEventListener(ev, markEditor, { passive: true });
		previewPane.addEventListener(ev, markPreview, { passive: true });
	}

	const onEditorScroll = () => {
		if (leader === ed) syncFrom(ed, previewPane);
	};
	const onPreviewScroll = () => {
		if (leader === previewPane) syncFrom(previewPane, ed);
	};
	ed.addEventListener("scroll", onEditorScroll, { passive: true });
	previewPane.addEventListener("scroll", onPreviewScroll, { passive: true });

	syncCleanup = () => {
		for (const ev of intents) {
			ed.removeEventListener(ev, markEditor);
			previewPane.removeEventListener(ev, markPreview);
		}
		ed.removeEventListener("scroll", onEditorScroll);
		previewPane.removeEventListener("scroll", onPreviewScroll);
	};

	// Align once from the editor when first enabled.
	leader = ed;
	syncFrom(ed, previewPane);
}

function disableSync() {
	if (syncCleanup) syncCleanup();
	syncCleanup = null;
	leader = null;
}

function applySync(on: boolean) {
	syncBtn.classList.toggle("active", on);
	syncBtn.setAttribute("aria-pressed", String(on));
	if (on) enableSync();
	else disableSync();
}

createEditor({
	parent: editorParent,
	doc: initialDoc,
	theme: themeKey(family, mode),
	onChange: (doc) => {
		currentDoc = doc;
		scheduleRender(doc);
		scheduleSave(doc);
	},
})
	.then((v) => {
		view = v;
		editorScroller = v.scrollDOM;
		applySync(syncEnabled);
		void maybeLoadSharedDoc(v);
	})
	.catch((err) => {
		console.error("Failed to initialise editor:", err);
		editorParent.textContent =
			"Failed to initialise the editor — see the console for details.";
	});

// If the URL carries a shared document (#doc=...), offer to load it.
async function maybeLoadSharedDoc(v: EditorView) {
	const payload = getSharedPayload();
	if (!payload) return;
	let text: string;
	try {
		text = await decodeDoc(payload);
	} catch (err) {
		console.error("Invalid share link:", err);
		return;
	}
	// Clear the fragment so a refresh won't reload (or re-prompt for) it.
	history.replaceState(null, "", location.pathname + location.search);
	// Confirm before replacing an existing saved document.
	if (loadDoc() && text !== currentDoc) {
		const ok = window.confirm(
			"Open the shared document? This replaces your current document.",
		);
		if (!ok) return;
	}
	v.dispatch({
		changes: { from: 0, to: v.state.doc.length, insert: text },
	});
}

// ---- Theme dropdown ----
function setThemeMenuOpen(open: boolean) {
	themeMenu.hidden = !open;
	themeBtn.setAttribute("aria-expanded", String(open));
}

themeBtn.addEventListener("click", (e) => {
	e.stopPropagation();
	setExportMenuOpen(false);
	setThemeMenuOpen(themeMenu.hidden);
});

themeMenu.addEventListener("click", (e) => {
	const item = (e.target as HTMLElement).closest("[data-family]");
	if (!item) return;
	family = item.getAttribute("data-family") as ThemeFamily;
	localStorage.setItem(FAMILY_KEY, family);
	applyTheme();
	setThemeMenuOpen(false);
});

modeBtn.addEventListener("click", () => {
	mode = mode === "dark" ? "light" : "dark";
	localStorage.setItem(MODE_KEY, mode);
	applyTheme();
});

function downloadMarkdown() {
	const blob = new Blob([currentDoc], { type: "text/markdown;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "document.md";
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

function exportPdf() {
	// Print dialog → "Save as PDF". Print CSS shows only the rendered preview.
	window.print();
}

// ---- Export dropdown (PDF / raw .md) ----
function setExportMenuOpen(open: boolean) {
	exportMenu.hidden = !open;
	exportBtn.setAttribute("aria-expanded", String(open));
}

exportBtn.addEventListener("click", (e) => {
	e.stopPropagation();
	setThemeMenuOpen(false);
	setExportMenuOpen(exportMenu.hidden);
});

exportMenu.addEventListener("click", (e) => {
	const item = (e.target as HTMLElement).closest("[data-export]");
	if (!item) return;
	const kind = item.getAttribute("data-export");
	setExportMenuOpen(false);
	if (kind === "pdf") exportPdf();
	else if (kind === "md") downloadMarkdown();
});

// Close menus on outside click or Escape.
document.addEventListener("click", () => {
	setExportMenuOpen(false);
	setThemeMenuOpen(false);
});
document.addEventListener("keydown", (e) => {
	if (e.key === "Escape") {
		setExportMenuOpen(false);
		setThemeMenuOpen(false);
	}
});

// ---- Copy raw .md to clipboard ----
function flashButton(btn: HTMLButtonElement, msg: string, restore: string) {
	btn.textContent = msg;
	window.setTimeout(() => {
		btn.textContent = restore;
	}, 1400);
}

copyBtn.addEventListener("click", async () => {
	const ok = await copyToClipboard(currentDoc);
	flashButton(copyBtn, ok ? "Copied!" : "Copy failed", "Copy .md");
});

// ---- Share: copy a link with the document encoded in the URL fragment ----
shareBtn.addEventListener("click", async () => {
	// Build the link and copy inside one gesture: the URL is produced lazily so the
	// clipboard write can keep the user activation across the async gzip step (Safari).
	let tooLong = false;
	const makeUrl = async () => {
		const url = await buildShareUrl(currentDoc);
		// Guard against unwieldy links from very large documents.
		if (url.length > 8000) {
			tooLong = true;
			throw new Error("share link too long");
		}
		return url;
	};
	try {
		const ok = await copyAsyncText(makeUrl);
		if (tooLong) {
			flashButton(shareBtn, "Doc too long", "Share");
		} else {
			flashButton(shareBtn, ok ? "Link copied!" : "Copy failed", "Share");
		}
	} catch (err) {
		console.error("Share failed:", err);
		flashButton(shareBtn, tooLong ? "Doc too long" : "Share failed", "Share");
	}
});

syncBtn.addEventListener("click", () => {
	syncEnabled = !syncEnabled;
	localStorage.setItem(SYNC_KEY, syncEnabled ? "on" : "off");
	applySync(syncEnabled);
});

// ---- Reset: clear saved data (document, theme, settings) ----
resetBtn.addEventListener("click", () => {
	const ok = window.confirm(
		"Clear all saved data (your document, theme, and settings) and reset Quick Math?",
	);
	if (!ok) return;
	try {
		localStorage.clear();
	} catch {
		// ignore storage errors
	}
	location.reload();
});
