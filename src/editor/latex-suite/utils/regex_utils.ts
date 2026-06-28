// Extracted from the upstream conceal feature (which is not ported), since
// auto_enlarge_brackets relies on this single helper.
export function escapeRegex(regex: string) {
	const escapeChars = ["\\", "(", ")", "+", "-", "[", "]", "{", "}", "."];

	for (const escapeChar of escapeChars) {
		regex = regex.replaceAll(escapeChar, "\\" + escapeChar);
	}

	return regex;
}
