// Type augmentations for the Obsidian-style helpers the engine expects.
export {};

declare global {
	interface String {
		contains(arg: string): boolean;
	}
	interface Array<T> {
		contains(arg: T): boolean;
	}
	interface ReadonlyArray<T> {
		contains(arg: T): boolean;
	}
	interface Set<T> {
		difference?: (this: Set<T>, other: Set<T>) => Set<T>;
		intersection?: (this: Set<T>, other: Set<T>) => Set<T>;
	}
}
