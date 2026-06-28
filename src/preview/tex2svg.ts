import { mathjax } from "mathjax-full/js/mathjax.js";
import { TeX } from "mathjax-full/js/input/tex.js";
import { SVG } from "mathjax-full/js/output/svg.js";
import { liteAdaptor } from "mathjax-full/js/adaptors/liteAdaptor.js";
import { RegisterHTMLHandler } from "mathjax-full/js/handlers/html.js";
import { AllPackages } from "mathjax-full/js/input/tex/AllPackages.js";

// KaTeX (used for the live preview) cannot emit SVG, so we use MathJax purely to
// convert a LaTeX string into a standalone SVG when the user exports one. This
// module is dynamically imported so MathJax is only loaded on first export.

let adaptor: ReturnType<typeof liteAdaptor> | null = null;
// MathJax's MathDocument type is awkward to name; `unknown` + a cast is fine here.
let doc: { convert(math: string, opts: { display: boolean }): unknown } | null =
	null;

function ensureDoc() {
	if (doc) return;
	adaptor = liteAdaptor();
	RegisterHTMLHandler(adaptor);
	const tex = new TeX({ packages: AllPackages });
	const svg = new SVG({ fontCache: "local" });
	doc = mathjax.document("", { InputJax: tex, OutputJax: svg }) as typeof doc;
}

/** Convert a LaTeX string to a standalone SVG markup string. */
export function tex2svg(latex: string, display: boolean): string {
	ensureDoc();
	const node = doc!.convert(latex, { display });
	let markup = adaptor!.innerHTML(node as never);

	// Ensure the SVG is a valid standalone document (namespaces for file usage).
	if (!/xmlns=/.test(markup)) {
		markup = markup.replace(
			/^<svg /,
			'<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ',
		);
	}
	return markup;
}
