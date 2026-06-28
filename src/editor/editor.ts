import { EditorView, basicSetup } from "codemirror";
import { EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { buildLatexSuiteExtensions } from "./latex-suite/setup";
import { editorTheme } from "./theme";

export interface CreateEditorOptions {
	parent: HTMLElement;
	doc: string;
	onChange: (doc: string) => void;
}

export async function createEditor({
	parent,
	doc,
	onChange,
}: CreateEditorOptions): Promise<EditorView> {
	const latexSuite = await buildLatexSuiteExtensions();

	const view = new EditorView({
		parent,
		state: EditorState.create({
			doc,
			extensions: [
				// LaTeX Suite first; its high-precedence keyboard plugin claims
				// Tab / snippet triggers before the default keymaps.
				latexSuite,
				basicSetup,
				markdown({ codeLanguages: [] }),
				EditorView.lineWrapping,
				// Fallback Tab → indent when LaTeX Suite did not handle it.
				keymap.of([indentWithTab]),
				EditorView.updateListener.of((u) => {
					if (u.docChanged) onChange(u.state.doc.toString());
				}),
				editorTheme,
			],
		}),
	});

	return view;
}
