import { LogSnapshot, MatchState } from "../shared/types";

const characterPatterns: RegExp[] = [
  /my(?:_|\s)?character(?:_|\s)?code\D+(\d{1,5})/i,
  /selected(?:_|\s)?character\D+(\d{1,5})/i,
  /character(?:_|\s)?code\D+(\d{1,5})/i,
];

const partyListPatterns: RegExp[] = [
  /party(?:_|\s)?members?\D+\[([^\]]+)\]/i,
  /all(?:y|ies)\D+\[([^\]]+)\]/i,
  /teammates?\D+\[([^\]]+)\]/i,
];

const partySinglePatterns: RegExp[] = [
  /party(?:_|\s)?member\D+(\d{1,5})/i,
  /ally(?:_|\s)?character\D+(\d{1,5})/i,
  /teammate(?:_|\s)?character\D+(\d{1,5})/i,
];

const statePatterns: Array<{ state: MatchState; regex: RegExp }> = [
  {
    state: "found",
    regex: /(MatchingComplete|MatchingPadding,\s*Matched|match\s*found|queue\s*pop|ready\s*check)/i,
  },
  {
    state: "searching",
    regex: /(MatchingPadding|queue\s*start|start\s*matchmaking|searching\s*for\s*match)/i,
  },
  {
    state: "in_match",
    regex: /(entered\s*game|load(?:ing)?\s*battle|spawn\s*complete)/i,
  },
  {
    state: "idle",
    regex: /(queue\s*cancel|leave\s*queue|return\s*to\s*lobby|match\s*end)/i,
  },
];

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

function extractCode(patterns: RegExp[], line: string): number | null {
  for (const pattern of patterns) {
    const match = line.match(pattern);
    if (!match?.[1]) continue;
    const code = Number(match[1]);
    if (Number.isInteger(code) && code > 0) {
      return code;
    }
  }

  return null;
}

function extractPartyCodes(line: string): number[] {
  for (const pattern of partyListPatterns) {
    const match = line.match(pattern);
    if (!match?.[1]) continue;

    const values = match[1]
      .split(/[\s,]+/)
      .map((token) => Number(token))
      .filter((code) => Number.isInteger(code) && code > 0);

    if (values.length > 0) {
      return uniqueSorted(values);
    }
  }

  const singleCode = extractCode(partySinglePatterns, line);
  return singleCode ? [singleCode] : [];
}

function extractMatchState(line: string): MatchState | null {
  for (const rule of statePatterns) {
    if (rule.regex.test(line)) return rule.state;
  }

  return null;
}

export class PlayerLogParser {
  private snapshot: LogSnapshot = {
    myCharacterCode: null,
    partyCharacterCodes: [],
    matchState: "idle",
    updatedAt: Date.now(),
  };

  getSnapshot(): LogSnapshot {
    return { ...this.snapshot };
  }

  consumeLine(rawLine: string): LogSnapshot | null {
    const line = rawLine.trim();
    if (!line) return null;

    let changed = false;

    const myCharacterCode = extractCode(characterPatterns, line);
    if (
      myCharacterCode !== null &&
      myCharacterCode !== this.snapshot.myCharacterCode
    ) {
      this.snapshot.myCharacterCode = myCharacterCode;
      changed = true;
    }

    const partyCodes = extractPartyCodes(line);
    if (partyCodes.length > 0) {
      const merged = uniqueSorted([
        ...this.snapshot.partyCharacterCodes,
        ...partyCodes,
      ]);
      const mergedText = merged.join(",");
      const beforeText = this.snapshot.partyCharacterCodes.join(",");
      if (mergedText !== beforeText) {
        this.snapshot.partyCharacterCodes = merged;
        changed = true;
      }
    }

    const detectedState = extractMatchState(line);
    if (detectedState && detectedState !== this.snapshot.matchState) {
      this.snapshot.matchState = detectedState;
      changed = true;
    }

    if (!changed) {
      return null;
    }

    this.snapshot = {
      ...this.snapshot,
      updatedAt: Date.now(),
      sourceLine: line,
    };

    return { ...this.snapshot };
  }

  resetParty(): LogSnapshot {
    this.snapshot = {
      ...this.snapshot,
      partyCharacterCodes: [],
      updatedAt: Date.now(),
    };

    return { ...this.snapshot };
  }
}
