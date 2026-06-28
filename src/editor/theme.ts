import { EditorView } from "@codemirror/view";

// Editor styling, including the tabstop placeholder highlight used by the
// LaTeX Suite snippet engine (`.latex-suite-snippet-placeholder`).
export const editorTheme = EditorView.theme({
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
