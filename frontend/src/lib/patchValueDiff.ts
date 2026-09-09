/** Preserve the original text while matching whole numbers and words across a patch change. */
export function diffPatchValue(summary: string) {
  const sides = summary.split("→");
  if (sides.length !== 2) return null;
  const tokenize = (text: string) => text.match(/\d+(?:\.\d+)?|\p{L}+|\s+|[^\p{L}\d\s]/gu) ?? [];
  const before = tokenize(sides[0]);
  const after = tokenize(sides[1]);
  // Keep level arrays aligned by position, even when a new value equals an old adjacent value.
  const isNumber = (text: string) => /^\d+(?:\.\d+)?$/.test(text);
  const oldValues = before.filter((text) => text.trim());
  const newValues = after.filter((text) => text.trim());
  if (
    oldValues.length === newValues.length &&
    oldValues.every(
      (text, index) => text === newValues[index] || (isNumber(text) && isNumber(newValues[index]))
    )
  ) {
    const compare = (tokens: string[], other: string[]) => {
      let index = 0;
      return tokens.map((text) => ({ text, changed: !!text.trim() && text !== other[index++] }));
    };
    return { before: compare(before, newValues), after: compare(after, oldValues) };
  }
  const lengths = Array.from(
    { length: before.length + 1 },
    () => new Uint32Array(after.length + 1)
  );
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      lengths[i][j] =
        before[i] === after[j]
          ? 1 + lengths[i + 1][j + 1]
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
    }
  }
  const oldParts = before.map((text) => ({ text, changed: text.trim().length > 0 }));
  const newParts = after.map((text) => ({ text, changed: text.trim().length > 0 }));
  let i = 0;
  let j = 0;
  while (i < before.length && j < after.length) {
    if (before[i] === after[j]) {
      oldParts[i++].changed = false;
      newParts[j++].changed = false;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) {
      i++;
    } else {
      j++;
    }
  }
  return { before: oldParts, after: newParts };
}
