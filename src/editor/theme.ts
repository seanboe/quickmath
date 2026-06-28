import { EditorView } from "@codemirror/view";
import { Extension, Prec } from "@codemirror/state";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags as t } from "@lezer/highlight";

// Structural styling that applies in both light and dark mode, including the
// tabstop placeholder highlight used by the LaTeX Suite snippet engine.
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

// Light mode relies on basicSetup's default theme + highlight style.
export const lightThemeExt: Extension = [];

const darkColors = EditorView.theme(
	{
		"&": {
			color: "#d6deeb",
			backgroundColor: "#0f1419",
		},
		".cm-content": {
			caretColor: "#c8c8ff",
		},
		".cm-cursor, .cm-dropCursor": {
			borderLeftColor: "#c8c8ff",
		},
		"&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection":
			{
				backgroundColor: "#27324a",
			},
		".cm-gutters": {
			backgroundColor: "#0f1419",
			color: "#5b6472",
			border: "none",
		},
		".cm-activeLine": {
			backgroundColor: "rgba(255, 255, 255, 0.03)",
		},
		".cm-activeLineGutter": {
			backgroundColor: "rgba(255, 255, 255, 0.05)",
		},
	},
	{ dark: true },
);

const darkHighlight = HighlightStyle.define([
	{ tag: t.heading, color: "#c792ea", fontWeight: "bold" },
	{ tag: t.strong, color: "#ffcb8b", fontWeight: "bold" },
	{ tag: t.emphasis, color: "#ffcb8b", fontStyle: "italic" },
	{ tag: [t.link, t.url], color: "#82aaff" },
	{ tag: t.monospace, color: "#7fdbca" },
	{ tag: t.quote, color: "#9aa5b1" },
	{ tag: [t.list, t.processingInstruction], color: "#82aaff" },
	{ tag: t.comment, color: "#637777", fontStyle: "italic" },
]);

export const darkThemeExt: Extension = [
	darkColors,
	// Prec.high so the dark highlight wins over basicSetup's default light one.
	Prec.high(syntaxHighlighting(darkHighlight)),
];
