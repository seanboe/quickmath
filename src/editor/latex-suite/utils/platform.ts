// Minimal stand-in for Obsidian's `Platform` helper, covering only the
// properties the LaTeX Suite engine actually uses.
const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
const platformStr =
	typeof navigator !== "undefined" ? navigator.platform || "" : "";

export const Platform = {
	isMacOS: /Mac/i.test(platformStr) || /Mac/i.test(ua),
	isMobile: /Android|iPhone|iPad|iPod/i.test(ua),
};
