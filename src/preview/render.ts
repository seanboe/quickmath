import MarkdownIt from "markdown-it";
import texmath from "markdown-it-texmath";
import katex from "katex";

const md = new MarkdownIt({
	html: false,
	linkify: true,
	typographer: false,
	breaks: false,
}).use(texmath, {
	engine: katex,
	delimiters: "dollars", // $...$ inline, $$...$$ display
	katexOptions: {
		throwOnError: false,
		strict: false,
	},
});

export function renderMarkdown(src: string): string {
	return md.render(src);
}
