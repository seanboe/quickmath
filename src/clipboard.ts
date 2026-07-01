/**
 * Copy text that is produced asynchronously, preserving the user gesture.
 *
 * Safari drops the transient user activation across an `await`, so awaiting the
 * text first (e.g. gzip-compressing a share link) and then calling
 * `writeText()` throws NotAllowedError. `clipboard.write()` accepts a
 * ClipboardItem whose data is a Promise, letting the async work resolve *inside*
 * the original gesture. Firefox rejects promise-backed items but keeps the
 * gesture across an await, so we fall back to awaiting the text there.
 */
export async function copyAsyncText(
	produce: () => Promise<string>,
): Promise<boolean> {
	if (navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
		try {
			const blob = produce().then(
				(t) => new Blob([t], { type: "text/plain" }),
			);
			await navigator.clipboard.write([
				new ClipboardItem({ "text/plain": blob }),
			]);
			return true;
		} catch {
			// Fall through: retry via the awaited path (Firefox / older browsers).
		}
	}
	try {
		return await copyToClipboard(await produce());
	} catch {
		return false;
	}
}

/** Copy text to the clipboard, with an execCommand fallback for old/insecure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
	try {
		if (navigator.clipboard?.writeText) {
			await navigator.clipboard.writeText(text);
			return true;
		}
	} catch {
		// fall through to legacy path
	}
	try {
		const ta = document.createElement("textarea");
		ta.value = text;
		ta.style.position = "fixed";
		ta.style.opacity = "0";
		document.body.appendChild(ta);
		ta.select();
		const ok = document.execCommand("copy");
		ta.remove();
		return ok;
	} catch {
		return false;
	}
}
