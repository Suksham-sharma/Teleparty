import prismaClient from "./prismaClient";

/**
 * Room codes are read aloud over a call ("join wolf forty-two"), so they avoid
 * homophones and ambiguous glyphs. Short, concrete, unmistakable nouns only.
 */
const WORDS = [
  "WOLF", "MOTH", "COMET", "FERN", "OTTER", "BASIL", "RAVEN", "PLUM",
  "CEDAR", "HERON", "MANGO", "LYNX", "AMBER", "CORAL", "FINCH", "OLIVE",
  "SABLE", "TULIP", "WILLOW", "BISON", "CLOVE", "DUSK", "EMBER", "FLINT",
  "GROVE", "HAZEL", "INDIGO", "JUNO", "KELP", "LARCH", "MARSH", "NOVA",
];

const randomCode = () => {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const number = 10 + Math.floor(Math.random() * 90); // always two digits
  return `${word}-${number}`;
};

/**
 * The keyspace is ~2,880 codes, so collisions are expected rather than rare —
 * retry until we find a free one, then fall back to a wider suffix so room
 * creation can never hard-fail on a busy instance.
 */
export const generateRoomCode = async (): Promise<string> => {
  for (let attempt = 0; attempt < 8; attempt++) {
    const code = randomCode();
    const taken = await prismaClient.room.findUnique({
      where: { code },
      select: { id: true },
    });
    if (!taken) return code;
  }

  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  return `${word}-${Date.now().toString(36).slice(-5).toUpperCase()}`;
};
