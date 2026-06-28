import { EditorView } from "@codemirror/view";
import { Extension, Prec } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

export type ThemeMode = "light" | "dark";
export type ThemeFamily = "default" | "ayu" | "dracula" | "catppuccin";
export type ThemeKey = `${ThemeFamily}-${ThemeMode}`;

export const FAMILIES: { name: ThemeFamily; label: string }[] = [
	{ name: "default", label: "Default" },
	{ name: "ayu", label: "Ayu Mirage" },
	{ name: "dracula", label: "Dracula" },
	{ name: "catppuccin", label: "Catppuccin" },
];

export function themeKey(family: ThemeFamily, mode: ThemeMode): ThemeKey {
	return `${family}-${mode}`;
}

// Structural styling shared by every theme, including the tabstop placeholder
// highlight used by the LaTeX Suite snippet engine.
export const baseTheme = EditorView.theme({
	"&": {
		height: "100%",
		fontSize: "15px",
	},
	".cm-scroller": {
		fontFamily:
			"'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
		lineHeight: "1.6",
		overflow: "auto",
	},
	".cm-content": {
		padding: "12px 0",
	},
	".latex-suite-snippet-placeholder": {
		borderRadius: "3px",
		backgroundColor: "rgba(123, 109, 217, 0.22)",
		outline: "1px solid rgba(123, 109, 217, 0.55)",
	},
});

interface EditorPalette {
	dark: boolean;
	bg: string;
	fg: string;
	caret: string;
	selection: string;
	gutterBg: string;
	gutterFg: string;
	activeLine: string;
	// Markdown element colors (editor side).
	heading: string;
	bold: string;
	italic: string;
	link: string;
	code: string;
	list: string;
	quote: string;
	comment: string;
	mark: string; // formatting marks: #, *, -, >, backticks, etc.
}

function makeEditorTheme(p: EditorPalette): Extension {
	const colors = EditorView.theme(
		{
			"&": { color: p.fg, backgroundColor: p.bg },
			".cm-content": { caretColor: p.caret },
			".cm-cursor, .cm-dropCursor": { borderLeftColor: p.caret },
			"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
				{ backgroundColor: p.selection },
			".cm-gutters": {
				backgroundColor: p.gutterBg,
				color: p.gutterFg,
				border: "none",
			},
			".cm-activeLine": { backgroundColor: p.activeLine },
			".cm-activeLineGutter": { backgroundColor: p.activeLine },
		},
		{ dark: p.dark },
	);

	const highlight = HighlightStyle.define([
		{
			tag: [
				t.heading,
				t.heading1,
				t.heading2,
				t.heading3,
				t.heading4,
				t.heading5,
				t.heading6,
			],
			color: p.heading,
			fontWeight: "bold",
		},
		{ tag: t.strong, color: p.bold, fontWeight: "bold" },
		{ tag: t.emphasis, color: p.italic, fontStyle: "italic" },
		{ tag: t.strikethrough, textDecoration: "line-through" },
		{ tag: [t.link, t.url], color: p.link, textDecoration: "underline" },
		{ tag: t.monospace, color: p.code },
		{ tag: t.list, color: p.list },
		{ tag: t.quote, color: p.quote, fontStyle: "italic" },
		// Formatting marks (HeaderMark "#", EmphasisMark "*", ListMark, etc.)
		{ tag: t.processingInstruction, color: p.mark },
		{ tag: t.comment, color: p.comment, fontStyle: "italic" },
	]);

	// Prec.high so a theme's highlight wins over basicSetup's default one.
	return [colors, Prec.high(syntaxHighlighting(highlight))];
}

// ---- Dark palettes ----
const darkPalette: EditorPalette = {
	dark: true,
	bg: "#0f1419",
	fg: "#d6deeb",
	caret: "#c8c8ff",
	selection: "#27324a",
	gutterBg: "#0f1419",
	gutterFg: "#5b6472",
	activeLine: "rgba(255, 255, 255, 0.04)",
	heading: "#c792ea",
	bold: "#ffcb8b",
	italic: "#ffcb8b",
	link: "#82aaff",
	code: "#7fdbca",
	list: "#82aaff",
	quote: "#9aa5b1",
	comment: "#637777",
	mark: "#5b6472",
};

const ayuDarkPalette: EditorPalette = {
	dark: true,
	bg: "#1f2430",
	fg: "#cccac2",
	caret: "#ffcc66",
	selection: "#33415e",
	gutterBg: "#1f2430",
	gutterFg: "#707a8c",
	activeLine: "rgba(255, 255, 255, 0.03)",
	heading: "#ffd173",
	bold: "#ffa759",
	italic: "#f28779",
	link: "#5ccfe6",
	code: "#95e6cb",
	list: "#ffa759",
	quote: "#8a9199",
	comment: "#5c6773",
	mark: "#707a8c",
};

const draculaDarkPalette: EditorPalette = {
	dark: true,
	bg: "#282a36",
	fg: "#f8f8f2",
	caret: "#f8f8f0",
	selection: "#44475a",
	gutterBg: "#282a36",
	gutterFg: "#6272a4",
	activeLine: "rgba(255, 255, 255, 0.04)",
	heading: "#ff79c6",
	bold: "#ffb86c",
	italic: "#f1fa8c",
	link: "#8be9fd",
	code: "#50fa7b",
	list: "#bd93f9",
	quote: "#6272a4",
	comment: "#6272a4",
	mark: "#6272a4",
};

const catppuccinDarkPalette: EditorPalette = {
	dark: true,
	bg: "#1e1e2e",
	fg: "#cdd6f4",
	caret: "#f5e0dc",
	selection: "#313244",
	gutterBg: "#1e1e2e",
	gutterFg: "#6c7086",
	activeLine: "rgba(255, 255, 255, 0.03)",
	heading: "#f38ba8",
	bold: "#fab387",
	italic: "#f9e2af",
	link: "#89b4fa",
	code: "#a6e3a1",
	list: "#cba6f7",
	quote: "#9399b2",
	comment: "#6c7086",
	mark: "#6c7086",
};

// ---- Light palettes ----
const ayuLightPalette: EditorPalette = {
	dark: false,
	bg: "#fcfcfc",
	fg: "#5c6166",
	caret: "#ff9940",
	selection: "#cfe6f5",
	gutterBg: "#fcfcfc",
	gutterFg: "#959da6",
	activeLine: "rgba(0, 0, 0, 0.03)",
	heading: "#fa8d3e",
	bold: "#f07171",
	italic: "#a37acc",
	link: "#399ee6",
	code: "#86b300",
	list: "#fa8d3e",
	quote: "#787b80",
	comment: "#abb0b6",
	mark: "#abb0b6",
};

const draculaLightPalette: EditorPalette = {
	dark: false,
	bg: "#f8f8f2",
	fg: "#1f1f1f",
	caret: "#644ac9",
	selection: "#dcdcd2",
	gutterBg: "#f8f8f2",
	gutterFg: "#9a957f",
	activeLine: "rgba(0, 0, 0, 0.03)",
	heading: "#a3144d",
	bold: "#a34d14",
	italic: "#846e15",
	link: "#036a96",
	code: "#14710a",
	list: "#644ac9",
	quote: "#635d49",
	comment: "#8c876d",
	mark: "#8c876d",
};

const catppuccinLightPalette: EditorPalette = {
	dark: false,
	bg: "#eff1f5",
	fg: "#4c4f69",
	caret: "#dc8a78",
	selection: "#ccd0da",
	gutterBg: "#eff1f5",
	gutterFg: "#8c8fa1",
	activeLine: "rgba(0, 0, 0, 0.03)",
	heading: "#d20f39",
	bold: "#fe640b",
	italic: "#df8e1d",
	link: "#1e66f5",
	code: "#40a02b",
	list: "#8839ef",
	quote: "#6c6f85",
	comment: "#8c8fa1",
	mark: "#8c8fa1",
};

// Default Light keeps the original look: basicSetup's default theme + highlight.
export const editorThemes: Record<ThemeKey, Extension> = {
	"default-light": [],
	"default-dark": makeEditorTheme(darkPalette),
	"ayu-light": makeEditorTheme(ayuLightPalette),
	"ayu-dark": makeEditorTheme(ayuDarkPalette),
	"dracula-light": makeEditorTheme(draculaLightPalette),
	"dracula-dark": makeEditorTheme(draculaDarkPalette),
	"catppuccin-light": makeEditorTheme(catppuccinLightPalette),
	"catppuccin-dark": makeEditorTheme(catppuccinDarkPalette),
};
