import { EditorState, SelectionRange } from "@codemirror/state";
import { EditorView, PluginValue, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { findMatchingBracket, getCloseBracket } from "@ls/utils/editor_utils";
import { Mode } from "@ls/snippets/options";
import { Environment } from "@ls/snippets/environment";
import { snippetLessArea, textAreaEnvs } from "./default_text_areas";

/**
 * Standalone re-implementation of the upstream `Context`.
 *
 * The Obsidian plugin determined math mode by walking Obsidian's custom
 * (HyperMD) Markdown syntax tree. In a vanilla CodeMirror editor that tree
 * does not exist, so instead we scan the document for `$`/`$$` math delimiters
 * (skipping escaped `\$`, fenced code blocks, and inline code spans) to decide
 * whether the cursor sits inside inline or display math, and where the
 * surrounding equation begins and ends.
 *
 * The environment helpers (`isWithinEnvironment`, `inTextEnvironment`) are
 * ported almost verbatim from upstream, since they are pure string logic that
 * operates on the equation bounds we compute here.
 */

export interface Bounds {
	inner_start: number;
	inner_end: number;
	outer_start: number;
	outer_end: number;
}

type MathRegionMode = "inline" | "block";
type MathRegion = Bounds & { mode: MathRegionMode };

/** Is the `$` at index `i` escaped by an odd run of preceding backslashes? */
function isEscaped(doc: string, i: number): boolean {
	let backslashes = 0;
	let k = i - 1;
	while (k >= 0 && doc[k] === "\\") {
		backslashes++;
		k--;
	}
	return backslashes % 2 === 1;
}

/** Find the next unescaped occurrence of `delim` (`$` or `$$`) at/after `from`. */
function findClosingDelim(doc: string, from: number, delim: string): number {
	let i = from;
	while (i < doc.length) {
		if (doc.startsWith(delim, i) && !isEscaped(doc, i)) {
			return i;
		}
		i++;
	}
	return -1;
}

/**
 * Scan the document for math regions, skipping fenced code blocks and inline
 * code spans so that `$` inside code is never treated as math.
 */
function scanMathRegions(doc: string): MathRegion[] {
	const regions: MathRegion[] = [];
	const n = doc.length;
	let i = 0;
	let atLineStart = true;
	let inFence = false;
	let inInlineCode = false;

	while (i < n) {
		const c = doc[i];

		if (c === "\n") {
			atLineStart = true;
			inInlineCode = false;
			i++;
			continue;
		}

		// Fenced code block toggling (``` or ~~~ at the start of a line).
		if (atLineStart) {
			let j = i;
			while (j < n && (doc[j] === " " || doc[j] === "\t")) j++;
			if (doc.startsWith("```", j) || doc.startsWith("~~~", j)) {
				inFence = !inFence;
				while (i < n && doc[i] !== "\n") i++;
				continue;
			}
		}
		atLineStart = false;

		if (inFence) {
			i++;
			continue;
		}

		if (c === "`") {
			let run = 0;
			while (i + run < n && doc[i + run] === "`") run++;
			inInlineCode = !inInlineCode;
			i += run;
			continue;
		}
		if (inInlineCode) {
			i++;
			continue;
		}

		if (c === "$" && !isEscaped(doc, i)) {
			const isDouble = doc[i + 1] === "$";
			if (isDouble) {
				const inner_start = i + 2;
				const close = findClosingDelim(doc, inner_start, "$$");
				if (close === -1) {
					i += 2;
					continue;
				}
				regions.push({
					outer_start: i,
					inner_start,
					inner_end: close,
					outer_end: close + 2,
					mode: "block",
				});
				i = close + 2;
				continue;
			} else {
				const inner_start = i + 1;
				const close = findClosingDelim(doc, inner_start, "$");
				if (close === -1) {
					i += 1;
					continue;
				}
				regions.push({
					outer_start: i,
					inner_start,
					inner_end: close,
					outer_end: close + 1,
					mode: "inline",
				});
				i = close + 1;
				continue;
			}
		}

		i++;
	}

	return regions;
}

export const contextPlugin = ViewPlugin.fromClass(
	class Context implements PluginValue {
		view: EditorView;
		state: EditorState;
		mode: Mode;
		pos: number;
		ranges: SelectionRange[];
		private regions: MathRegion[] = [];
		shouldUpdate = false;

		constructor(view: EditorView) {
			this.updateFromView(view);
		}

		init(view: EditorView) {
			if (this.shouldUpdate) {
				this.updateFromView(view);
				this.shouldUpdate = false;
			}
			return this;
		}

		update(update: ViewUpdate) {
			if (!(update.docChanged || update.selectionSet)) return;
			this.shouldUpdate = true;
		}

		updateFromView(view: EditorView) {
			const state = view.state;
			const sel = state.selection;
			this.view = view;
			this.state = state;
			this.pos = sel.main.to;
			this.ranges = Array.from(sel.ranges).reverse(); // last to first
			this.mode = new Mode();
			this.regions = scanMathRegions(state.doc.toString());

			const bounds = this.findRegion(this.pos);
			if (bounds) {
				this.mode.inlineMath = bounds.mode === "inline";
				this.mode.blockMath = bounds.mode === "block";

				const textEnv = this.inTextEnvironment();
				if (textEnv === "text") {
					this.mode.textEnv = true;
				} else if (textEnv === "none") {
					this.mode.snippetlessEnv = true;
				}
			}

			this.mode.text = !bounds;
		}

		private findRegion(pos: number): MathRegion | null {
			for (const r of this.regions) {
				if (pos >= r.inner_start && pos <= r.inner_end) return r;
			}
			return null;
		}

		getBounds(pos: number = this.pos): Bounds | null {
			return this.findRegion(pos);
		}

		// Accounts for equations within text environments, e.g. $$\text{... $...$}$$
		getInnerBounds(pos: number = this.pos): Bounds | null {
			const bounds = this.getBounds(pos);
			if (!bounds) return null;

			let text = this.state.sliceDoc(bounds.inner_start, bounds.inner_end);
			// ignore \$
			text = text.replaceAll("\\$", "\\R");

			const rel = pos - bounds.inner_start;
			const left = text.lastIndexOf("$", rel - 1);
			const right = text.indexOf("$", rel);

			if (left === -1 || right === -1) return bounds;

			return {
				inner_start: bounds.inner_start + left + 1,
				inner_end: bounds.inner_start + right,
				outer_start: bounds.inner_start + left,
				outer_end: bounds.inner_start + right + 1,
			};
		}

		isWithinEnvironment<T extends Environment>(
			pos: number,
			envs: T | T[],
		): (T & Bounds) | null {
			if (!this.mode.inMath()) return null;

			const bounds = this.getInnerBounds();
			if (!bounds) return null;

			const { inner_start: start, inner_end: end } = bounds;
			const text = this.state.sliceDoc(start, end);

			// pos referred to the absolute position in the whole document, but we
			// just sliced the text so now pos must be relative to the start.
			pos -= start;

			if (!Array.isArray(envs)) {
				envs = [envs];
			}
			outer_loop: for (const env of envs) {
				const openBracket = env.openSymbol.slice(-1);
				const closeBracket = getCloseBracket(openBracket);

				// Take care when the open symbol ends with a bracket {, [, or (
				// as then the closing symbol, }, ] or ), is not unique to this open symbol
				let offset;
				let openSearchSymbol;

				if (
					["{", "[", "("].contains(openBracket) &&
					env.closeSymbol === closeBracket
				) {
					offset = env.openSymbol.length - 1;
					openSearchSymbol = openBracket;
				} else {
					offset = 0;
					openSearchSymbol = env.openSymbol;
				}

				let left = text.lastIndexOf(env.openSymbol, pos - 1);

				while (left != -1) {
					const right = findMatchingBracket(
						text,
						left + offset,
						openSearchSymbol,
						env.closeSymbol,
						false,
					);

					if (right === null) continue outer_loop;

					// Check whether the cursor lies inside the environment symbols
					if (right >= pos && pos >= left + env.openSymbol.length) {
						return {
							...env,
							inner_start: left + env.openSymbol.length + start,
							inner_end: right + start,
							outer_start: left + start,
							outer_end: right + env.closeSymbol.length + start,
						};
					}

					if (left <= 0) continue outer_loop;

					// Find the next open symbol
					left = text.lastIndexOf(env.openSymbol, left - 1);
				}
			}

			return null;
		}

		inTextEnvironment(): "text" | "none" | null {
			const result = this.isWithinEnvironment(this.pos, textAreaEnvs);
			if (!result) return null;
			const openSymbol = result.openSymbol.slice(1, -1);
			if (
				snippetLessArea.includes(
					openSymbol as (typeof snippetLessArea)[number],
				)
			) {
				return "none";
			} else {
				return "text";
			}
		}
	},
);

type ContextPluginValue<T> = T extends ViewPlugin<infer V> ? V : never;
export type Context = ContextPluginValue<typeof contextPlugin>;

export const getContextPlugin = (
	view: EditorView,
	init: boolean = true,
): Context => {
	const plugin = view.plugin(contextPlugin);
	if (!plugin) {
		throw new Error(
			"Context plugin not found, something went wrong with the plugin initialization",
		);
	}
	return init ? plugin.init(view) : plugin;
};
