import { EditorState } from "@codemirror/state";
import { Snippet, SnippetType } from "@ls/snippets/snippets";

// Standalone replacements for the small set of Obsidian helpers the engine used.
// Obsidian patched `createEl`/`createDiv` onto the DOM and provided `Notice`;
// in the browser build we use plain DOM and the console instead.
export function createElement(
	tagName: Parameters<Document["createElement"]>[0],
) {
	return document.createElement(tagName);
}

// Debug-only snippet info. The Obsidian build showed a Notice; here we just log.
export function showSnippetInfo(
	_state: EditorState,
	snippet: Snippet<SnippetType>,
	replacement: string,
	containsTrigger: boolean,
) {
	console.debug("[latex-suite] snippet expanded", {
		description: snippet.description,
		trigger: snippet.trigger.toString(),
		triggerKey: snippet.triggerKey || undefined,
		replacement,
		autoEnlargeBrackets: containsTrigger,
	});
}
