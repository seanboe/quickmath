import { EditorView, basicSetup } from "codemirror";
import { Compartment, EditorState } from "@codemirror/state";
import { keymap } from "@codemirror/view";
import { indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { buildLatexSuiteExtensions } from "./latex-suite/setup";
import { baseTheme, editorThemes, ThemeKey } from "./theme";

export interface CreateEditorOptions {
	parent: HTMLElement;
	doc: string;
	theme: ThemeKey;
	onChange: (doc: string) => void;
}

const themeCompartment = new Compartment();

export async function createEditor({
	parent,
	doc,
	theme,
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
				// Theme compartment before basicSetup so a theme's highlight
				// overrides basicSetup's default light highlight style.
				themeCompartment.of(editorThemes[theme]),
				basicSetup,
				// Per-language parsers for fenced code blocks; each grammar is
				// lazily fetched only when a block of that language first appears.
				markdown({ codeLanguages: languages }),
				EditorView.lineWrapping,
				// Fallback Tab → indent when LaTeX Suite did not handle it.
				keymap.of([indentWithTab]),
				EditorView.updateListener.of((u) => {
					if (u.docChanged) onChange(u.state.doc.toString());
				}),
				baseTheme,
			],
		}),
	});

	return view;
}

export function setEditorTheme(view: EditorView, theme: ThemeKey): void {
	view.dispatch({
		effects: themeCompartment.reconfigure(editorThemes[theme]),
	});
}
