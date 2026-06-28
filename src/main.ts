import "./polyfills";
import "katex/dist/katex.min.css";
import "./style.css";

import { EditorView } from "@codemirror/view";
import { createEditor, setEditorTheme } from "./editor/editor";
import { THEMES, type ThemeName } from "./editor/theme";
import { renderMarkdown } from "./preview/render";
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
const themeBtn = document.getElementById("btn-theme") as HTMLButtonElement;
const themeMenu = document.getElementById("theme-menu") as HTMLElement;
const syncBtn = document.getElementById("btn-sync") as HTMLButtonElement;

// Editor handle, declared early so applyTheme can reach it once it exists.
let view: EditorView | undefined;

// ---- Color theme ----
const THEME_KEY = "latex-suite-web:theme";
const THEME_NAMES = THEMES.map((th) => th.name);

function getInitialTheme(): ThemeName {
	const stored = localStorage.getItem(THEME_KEY) as ThemeName | null;
	if (stored && THEME_NAMES.includes(stored)) return stored;
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

let theme = getInitialTheme();

// Build the theme menu items from the THEMES list.
for (const { name, label } of THEMES) {
	const item = document.createElement("button");
	item.type = "button";
	item.className = "dropdown-item";
	item.setAttribute("role", "menuitemradio");
	item.dataset.theme = name;
	item.textContent = label;
	themeMenu.appendChild(item);
}

function applyTheme(name: ThemeName) {
	theme = name;
	document.body.dataset.theme = name;
	if (view) setEditorTheme(view, name);
	for (const item of Array.from(themeMenu.children) as HTMLElement[]) {
		item.classList.toggle("active", item.dataset.theme === name);
	}
}
applyTheme(theme);

// ---- Editor + preview ----
const render = (doc: string) => {
	preview.innerHTML = renderMarkdown(doc);
};
const scheduleRender = debounce(render, 80);
const scheduleSave = debounce(saveDoc, 300);

const initialDoc = loadDoc() ?? DEMO_DOC;
let currentDoc = initialDoc;
render(initialDoc);

// ---- Synchronized scrolling ----
const SYNC_KEY = "latex-suite-web:sync";
let syncEnabled = localStorage.getItem(SYNC_KEY) === "on";
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
	theme,
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
	})
	.catch((err) => {
		console.error("Failed to initialise editor:", err);
		editorParent.textContent =
			"Failed to initialise the editor — see the console for details.";
	});

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
	const item = (e.target as HTMLElement).closest("[data-theme]");
	if (!item) return;
	const name = item.getAttribute("data-theme") as ThemeName;
	localStorage.setItem(THEME_KEY, name);
	applyTheme(name);
	setThemeMenuOpen(false);
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
async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// fall through to legacy path
	}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		ta.remove();
		return ok;
	} catch {
		return false;
	}
}

let copyResetTimer: ReturnType<typeof setTimeout> | undefined;
copyBtn.addEventListener("click", async () => {
	const ok = await copyToClipboard(currentDoc);
	copyBtn.textContent = ok ? "Copied!" : "Copy failed";
	if (copyResetTimer) clearTimeout(copyResetTimer);
	copyResetTimer = setTimeout(() => {
		copyBtn.textContent = "Copy .md";
	}, 1400);
});

syncBtn.addEventListener("click", () => {
	syncEnabled = !syncEnabled;
	localStorage.setItem(SYNC_KEY, syncEnabled ? "on" : "off");
	applySync(syncEnabled);
});
