import "./polyfills";
import "katex/dist/katex.min.css";
import "./style.css";

import { createEditor } from "./editor/editor";
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

const render = (doc: string) => {
	preview.innerHTML = renderMarkdown(doc);
};
const scheduleRender = debounce(render, 80);
const scheduleSave = debounce(saveDoc, 300);

const initialDoc = loadDoc() ?? DEMO_DOC;
render(initialDoc);

createEditor({
	parent: editorParent,
	doc: initialDoc,
	onChange: (doc) => {
		scheduleRender(doc);
		scheduleSave(doc);
	},
}).catch((err) => {
	console.error("Failed to initialise editor:", err);
	editorParent.textContent =
		"Failed to initialise the editor — see the console for details.";
});
