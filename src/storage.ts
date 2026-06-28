const STORAGE_KEY = "latex-suite-web:doc";

export function loadDoc(): string | null {
	try {
		return localStorage.getItem(STORAGE_KEY);
	} catch {
		return null;
	}
}

export function saveDoc(doc: string): void {
	try {
		localStorage.setItem(STORAGE_KEY, doc);
	} catch {
		// ignore (e.g. private mode quota errors)
	}
}

export function debounce<A extends unknown[]>(
	fn: (...args: A) => void,
	ms: number,
): (...args: A) => void {
	let timer: ReturnType<typeof setTimeout> | undefined;
	return (...args: A) => {
		if (timer) clearTimeout(timer);
		timer = setTimeout(() => fn(...args), ms);
	};
}
