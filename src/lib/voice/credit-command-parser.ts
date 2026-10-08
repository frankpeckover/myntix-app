export type ParsedVoiceCreditCommand = {
  amount: number;
  direction: "add" | "remove";
  reason: string;
  studentName: string;
};

export type VoiceCreditCommandParseResult =
  | { ok: true; command: ParsedVoiceCreditCommand }
  | { ok: false; message: string };

const spokenAmountPattern =
  "(?:\\d+|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)(?:[- ](?:one|two|three|four|five|six|seven|eight|nine))?";
const unitPattern = "(?:credits?|points?)";

const commandPatterns: Array<{
  direction: "add" | "remove";
  expression: RegExp;
}> = [
  {
    direction: "add",
    expression: new RegExp(
      `^(?:give|award)\\s+(.+?)\\s+(${spokenAmountPattern})\\s+${unitPattern}(?:\\s+(?:for|because)\\s+(.+))?$`,
      "i",
    ),
  },
  {
    direction: "add",
    expression: new RegExp(
      `^add\\s+(${spokenAmountPattern})\\s+${unitPattern}\\s+to\\s+(.+?)(?:\\s+(?:for|because)\\s+(.+))?$`,
      "i",
    ),
  },
  {
    direction: "remove",
    expression: new RegExp(
      `^(?:take|remove|deduct)\\s+(${spokenAmountPattern})\\s+${unitPattern}\\s+from\\s+(.+?)(?:\\s+(?:for|because)\\s+(.+))?$`,
      "i",
    ),
  },
];

const numberWords: Record<string, number> = {
  eight: 8,
  eighteen: 18,
  eighty: 80,
  eleven: 11,
  fifteen: 15,
  fifty: 50,
  five: 5,
  forty: 40,
  four: 4,
  fourteen: 14,
  nine: 9,
  nineteen: 19,
  ninety: 90,
  one: 1,
  seven: 7,
  seventeen: 17,
  seventy: 70,
  six: 6,
  sixteen: 16,
  sixty: 60,
  ten: 10,
  thirteen: 13,
  thirty: 30,
  three: 3,
  twelve: 12,
  twenty: 20,
  two: 2,
};

export function parseVoiceCreditCommand(
  transcript: string,
): VoiceCreditCommandParseResult {
  const normalisedTranscript = transcript
    .trim()
    .replace(/[.,!?]+$/g, "")
    .replace(/\s+/g, " ");

  for (const pattern of commandPatterns) {
    const match = normalisedTranscript.match(pattern.expression);
    if (!match) continue;

    const usesNameFirst = pattern.direction === "add" && /give|award/i.test(match[0]);
    const studentName = (usesNameFirst ? match[1] : match[2])?.trim() ?? "";
    const amountText = (usesNameFirst ? match[2] : match[1])?.trim() ?? "";
    const reason = match[3]?.trim() ?? "";
    const amount = parseSpokenAmount(amountText);

    if (!studentName || amount === null || amount <= 0) {
      break;
    }

    return {
      ok: true,
      command: {
        amount,
        direction: pattern.direction,
        reason,
        studentName,
      },
    };
  }

  return {
    ok: false,
    message:
      'Try “Give Jordan Lee 10 credits for helping” or “Take 5 credits from Jordan Lee for being late”.',
  };
}

function parseSpokenAmount(value: string) {
  if (/^\d+$/.test(value)) {
    return Number(value);
  }

  const parts = value.toLowerCase().split(/[- ]/).filter(Boolean);
  const amounts = parts.map((part) => numberWords[part]);
  if (amounts.some((amount) => amount === undefined)) return null;

  return amounts.reduce((total, amount) => total + amount, 0);
}
