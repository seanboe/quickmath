import "./polyfills";
import "katex/dist/katex.min.css";
import "./style.css";

import { EditorView } from "@codemirror/view";
import { createEditor, setEditorDark } from "./editor/editor";
import { renderMarkdown } from "./preview/render";
import { loadDoc, saveDoc, debounce } from "./storage";

const DEMO_DOC = `# LaTeX Suite — Markdown Editor

Type Markdown on the left; it renders live on the right.

Math uses the same fast typing shortcuts as
[obsidian-latex-suite](https://github.com/artisticat1/obsidian-latex-suite).

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
const saveBtn = document.getElementById("btn-save") as HTMLButtonElement;
const pdfBtn = document.getElementById("btn-pdf") as HTMLButtonElement;
const themeBtn = document.getElementById("btn-theme") as HTMLButtonElement;
const syncBtn = document.getElementById("btn-sync") as HTMLButtonElement;

// ---- Theme (dark mode) ----
const THEME_KEY = "latex-suite-web:theme";

function getInitialDark(): boolean {
	const stored = localStorage.getItem(THEME_KEY);
	if (stored === "dark") return true;
	if (stored === "light") return false;
	return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

let dark = getInitialDark();

function applyTheme(isDark: boolean) {
	document.body.classList.toggle("dark", isDark);
	themeBtn.textContent = isDark ? "☀️" : "🌙";
}
applyTheme(dark);

// ---- Editor + preview ----
const render = (doc: string) => {
	preview.innerHTML = renderMarkdown(doc);
};
const scheduleRender = debounce(render, 80);
const scheduleSave = debounce(saveDoc, 300);

const initialDoc = loadDoc() ?? DEMO_DOC;
let currentDoc = initialDoc;
render(initialDoc);

let view: EditorView | undefined;

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
	dark,
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

// ---- Button actions ----
themeBtn.addEventListener("click", () => {
	dark = !dark;
	localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
	applyTheme(dark);
	if (view) setEditorDark(view, dark);
});

saveBtn.addEventListener("click", () => {
	const blob = new Blob([currentDoc], { type: "text/markdown;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "document.md";
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
});

pdfBtn.addEventListener("click", () => {
	// Print dialog → "Save as PDF". Print CSS shows only the rendered preview.
	window.print();
});

syncBtn.addEventListener("click", () => {
	syncEnabled = !syncEnabled;
	localStorage.setItem(SYNC_KEY, syncEnabled ? "on" : "off");
	applySync(syncEnabled);
});
