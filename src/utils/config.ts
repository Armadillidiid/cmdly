const CURRENT_MARKER = "(Current)";

export const markCurrentChoice = <T extends { title: string; value: V }, V>(
	choices: T[],
	currentValue: V | undefined,
	predicate?: () => boolean,
): T[] => {
	if (!currentValue || (predicate && !predicate())) {
		return choices;
	}

	const currentIndex = choices.findIndex((item) => item.value === currentValue);

	if (currentIndex < 0) {
		return choices;
	}

	const currentItem = choices[currentIndex];
	if (!currentItem) {
		return choices;
	}

	const markedItem = {
		...currentItem,
		title: `${currentItem.title} ${CURRENT_MARKER}`,
	} as T;

	return [
		markedItem,
		...choices.slice(0, currentIndex),
		...choices.slice(currentIndex + 1),
	];
};

/** Removes the "(Current)" marker from a title string */
export const stripCurrentMarker = (text: string): string =>
	text.replace(` ${CURRENT_MARKER}`, "");
