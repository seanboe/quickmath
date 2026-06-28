import { Extension, Prec } from "@codemirror/state";
import { EditorView, keymap } from "@codemirror/view";
import {
	DEFAULT_SETTINGS,
	processLatexSuiteSettings,
} from "@ls/settings/settings";
import { getLatexSuiteConfigExtension } from "@ls/snippets/codemirror/config";
import { parseSnippets, parseSnippetVariables } from "@ls/snippets/parse";
import {
	handleUpdate,
	onInput,
	keyboardEventPlugin,
	getKeymaps,
} from "@ls/latex_suite";
import { snippetExtensions } from "@ls/snippets/codemirror/extensions";
import { contextPlugin } from "@ls/utils/context";

/**
 * Build the full LaTeX Suite CodeMirror extension bundle.
 *
 * This mirrors the compulsory-extension assembly from the Obsidian plugin's
 * `setEditorExtensions`, minus the optional conceal / bracket-highlight /
 * math-preview features which are not ported. Parsing the default snippets is
 * asynchronous because the engine evaluates the snippet source via a dynamic
 * module import.
 */
export async function buildLatexSuiteExtensions(): Promise<Extension> {
	const variables = await parseSnippetVariables(
		DEFAULT_SETTINGS.snippetVariables,
		"snippet-variables.js",
	);
	const snippets = await parseSnippets(
		DEFAULT_SETTINGS.snippets,
		variables,
		"snippets.js",
	);

	const cmSettings = processLatexSuiteSettings(snippets, {
		...DEFAULT_SETTINGS,
		// Features that are not ported in the web build.
		mathPreviewEnabled: false,
		concealEnabled: false,
		colorPairedBracketsEnabled: false,
		highlightCursorBracketsEnabled: false,
	});

	return [
		Prec.highest(contextPlugin.extension),
		getLatexSuiteConfigExtension(cmSettings),
		Prec.highest(keyboardEventPlugin.extension),
		Prec.highest(EditorView.inputHandler.of(onInput)),
		EditorView.updateListener.of(handleUpdate),
		snippetExtensions,
		keymap.of(getKeymaps(cmSettings)),
	];
}
