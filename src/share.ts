// Backend-free document sharing: the document is gzip-compressed and packed into
// the URL fragment (#doc=...). The fragment never reaches a server, so this works
// on static hosting (GitHub Pages) with no API. A 1-char scheme prefix records
// whether the payload is gzipped ("1") or raw base64 ("0"), so we can fall back
// gracefully on browsers without CompressionStream.

function toBase64Url(bytes: Uint8Array): string {
	let bin = "";
	for (const b of bytes) bin += String.fromCharCode(b);
	return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(s: string): Uint8Array {
	s = s.replace(/-/g, "+").replace(/_/g, "/");
	while (s.length % 4) s += "=";
	const bin = atob(s);
	const bytes = new Uint8Array(bin.length);
	for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
	return bytes;
}

async function pipeThrough(
	bytes: Uint8Array,
	transform: "gzip-c" | "gzip-d",
): Promise<Uint8Array> {
	const stream =
		transform === "gzip-c"
			? new CompressionStream("gzip")
			: new DecompressionStream("gzip");
	const piped = new Blob([bytes as BlobPart])
		.stream()
		.pipeThrough(stream as never);
	const buf = await new Response(piped).arrayBuffer();
	return new Uint8Array(buf);
}

const supportsCompression = typeof CompressionStream !== "undefined";

/** Encode document text into a URL-safe fragment payload. */
export async function encodeDoc(text: string): Promise<string> {
	const input = new TextEncoder().encode(text);
	if (supportsCompression) {
		const compressed = await pipeThrough(input, "gzip-c");
		return "1" + toBase64Url(compressed);
	}
	return "0" + toBase64Url(input);
}

/** Decode a fragment payload back into document text. */
export async function decodeDoc(payload: string): Promise<string> {
	const scheme = payload[0];
	const body = fromBase64Url(payload.slice(1));
	const bytes = scheme === "1" ? await pipeThrough(body, "gzip-d") : body;
	return new TextDecoder().decode(bytes);
}

/** The share payload from the current URL fragment, if any. */
export function getSharedPayload(): string | null {
	const m = location.hash.match(/^#doc=(.+)$/);
	return m ? m[1] : null;
}

/** Build a shareable URL for the given document text. */
export async function buildShareUrl(text: string): Promise<string> {
	const payload = await encodeDoc(text);
	return `${location.origin}${location.pathname}#doc=${payload}`;
}
