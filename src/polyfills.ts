// The LaTeX Suite engine was written for Obsidian, which patches `contains`
// onto String/Array/Node prototypes. Recreate the small subset it relies on.
/* eslint-disable @typescript-eslint/no-explicit-any */
const S = String.prototype as any;
if (typeof S.contains !== "function") {
	S.contains = function (this: string, arg: string): boolean {
		return this.includes(arg);
	};
}

const A = Array.prototype as any;
if (typeof A.contains !== "function") {
	A.contains = function (this: unknown[], arg: unknown): boolean {
		return this.includes(arg);
	};
}

export {};
