// Syntax highlighting for rendered code blocks, loaded from a CDN (highlight.js).
// The library and its theme stylesheet are fetched lazily the first time a
// document is rendered; if the CDN is unreachable, code simply stays uncolored.

const HLJS_VERSION = "11.9.0";
const CDN = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/${HLJS_VERSION}`;

interface Hljs {
	highlightElement(el: HTMLElement): void;
}

let hljsReady: Promise<Hljs> | null = null;

function loadHljs(): Promise<Hljs> {
	if (hljsReady) return hljsReady;
	hljsReady = new Promise<Hljs>((resolve, reject) => {
		const script = document.createElement("script");
		script.src = `${CDN}/highlight.min.js`;
		script.async = true;
		script.onload = () => {
			const hljs = (window as unknown as { hljs?: Hljs }).hljs;
			hljs ? resolve(hljs) : reject(new Error("highlight.js missing"));
		};
		script.onerror = () => reject(new Error("failed to load highlight.js"));
		document.head.appendChild(script);
	});
	return hljsReady;
}

let styleLink: HTMLLinkElement | null = null;

/** Point the highlight.js theme at a light or dark stylesheet to match the app. */
export function setHighlightMode(mode: "light" | "dark"): void {
	const theme = mode === "dark" ? "github-dark" : "github";
	if (!styleLink) {
		styleLink = document.createElement("link");
		styleLink.rel = "stylesheet";
		document.head.appendChild(styleLink);
	}
	styleLink.href = `${CDN}/styles/${theme}.min.css`;
}

/** Highlight every fenced code block within the container. Inline code is left as-is. */
export function highlightCodeBlocks(container: HTMLElement): void {
	const blocks = container.querySelectorAll<HTMLElement>("pre code");
	if (blocks.length === 0) return;
	loadHljs()
		.then((hljs) => blocks.forEach((el) => hljs.highlightElement(el)))
		.catch(() => {
			/* offline or CDN blocked — leave code blocks unhighlighted */
		});
}
