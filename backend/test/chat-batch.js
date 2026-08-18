const { execSync } = require("child_process");
const os = require("os");
const path = require("path");
const fs = require("fs");

const root = path.join(__dirname, "..");
const outDir = fs.mkdtempSync(path.join(os.tmpdir(), "chat-batch-"));

fs.copyFileSync(
  path.join(root, "src/lib/chatBatch.ts"),
  path.join(outDir, "chatBatch.ts")
);

execSync(
  `npx tsc ${path.join(outDir, "chatBatch.ts")} ` +
    `--outDir ${outDir} --module commonjs --target es2020 --strict --skipLibCheck`,
  { cwd: root, stdio: "inherit" }
);

const { parseChatBatch, buildChatRows, authorIdsIn, MAX_BODY_LENGTH } = require(
  path.join(outDir, "chatBatch.js")
);

let failures = 0;
let checks = 0;

function check(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  checks += 1;
  if (!ok) failures += 1;
  console.log(
    `${ok ? "ok  " : "FAIL"} ${label} ${ok ? "" : `\n     expected ${JSON.stringify(expected)}\n     got      ${JSON.stringify(actual)}`}`
  );
}

const sentAt = "2026-08-18T10:00:00.000Z";

const wire = (over = {}) =>
  JSON.stringify({
    id: "m1",
    code: "WOLF-42",
    memberId: "mem-1",
    name: "Ada",
    body: "hello",
    sentAt,
    ...over,
  });

const author = (over = {}) => ({
  id: "mem-1",
  userId: "user-1",
  roomId: "room-1",
  room: { code: "WOLF-42" },
  ...over,
});

console.log("\nparsing a batch\n");

check(
  "a well-formed batch parses whole",
  parseChatBatch([wire(), wire({ id: "m2" })]).messages.map((m) => m.id),
  ["m1", "m2"]
);

check(
  "unparseable json is dropped, not fatal",
  (() => {
    const { messages, dropped } = parseChatBatch(["{oops", wire()]);
    return [messages.map((m) => m.id), dropped];
  })(),
  [["m1"], 1]
);

check(
  "one bad element does not lose the rest of the batch",
  parseChatBatch([wire({ id: "m1" }), "null", wire({ id: "m3" })]).messages
    .length,
  2
);

check(
  "a message with no id is dropped",
  parseChatBatch([wire({ id: undefined })]).dropped,
  1
);

check(
  "a message with no memberId is dropped",
  parseChatBatch([wire({ memberId: undefined })]).dropped,
  1
);

check(
  "a non-string body is dropped rather than coerced",
  parseChatBatch([wire({ body: 42 })]).dropped,
  1
);

check(
  "an empty body is dropped",
  parseChatBatch([wire({ body: "" })]).dropped,
  1
);

console.log("\nresolving authors\n");

check(
  "author ids are de-duplicated so the lookup is one query",
  authorIdsIn(
    parseChatBatch([wire(), wire({ id: "m2" }), wire({ id: "m3", memberId: "mem-2" })])
      .messages
  ),
  ["mem-1", "mem-2"]
);

console.log("\nbuilding rows\n");

const { messages } = parseChatBatch([wire()]);

check(
  "a resolved message becomes one row",
  buildChatRows(messages, [author()]).map((r) => [
    r.id,
    r.roomId,
    r.memberId,
    r.authorLabel,
    r.userId,
    r.body,
  ]),
  [["m1", "room-1", "mem-1", "Ada", "user-1", "hello"]]
);

check(
  "the room id comes from the member, never from the wire",
  buildChatRows(messages, [author({ roomId: "room-9" })])[0].roomId,
  "room-9"
);

check(
  "a guest's message persists with a null userId",
  buildChatRows(messages, [author({ userId: null })])[0].userId,
  null
);

check(
  "an unknown member is dropped — persistence is not a second identity",
  buildChatRows(messages, []),
  []
);

check(
  "a member from another room cannot write into this room's history",
  buildChatRows(messages, [author({ room: { code: "BEAR-11" } })]),
  []
);

check(
  "the room code is matched case-insensitively",
  buildChatRows(parseChatBatch([wire({ code: "wolf-42" })]).messages, [
    author(),
  ]).length,
  1
);

check(
  "sentAt is preserved so history keeps the order chat was said in",
  buildChatRows(messages, [author()])[0].createdAt.toISOString(),
  sentAt
);

const fallbackNow = new Date("2026-01-01T00:00:00.000Z");

check(
  "an unparseable sentAt falls back to now rather than an Invalid Date",
  buildChatRows(
    parseChatBatch([wire({ sentAt: "nonsense" })]).messages,
    [author()],
    fallbackNow
  )[0].createdAt.toISOString(),
  fallbackNow.toISOString()
);

check(
  "an over-long body is truncated to the column's limit",
  buildChatRows(parseChatBatch([wire({ body: "x".repeat(5000) })]).messages, [
    author(),
  ])[0].body.length,
  MAX_BODY_LENGTH
);

check(
  "a redelivered id is written once per batch",
  buildChatRows(parseChatBatch([wire(), wire()]).messages, [author()]).length,
  1
);

check(
  "two members in one batch both resolve",
  buildChatRows(
    parseChatBatch([wire(), wire({ id: "m2", memberId: "mem-2", name: "Bo" })])
      .messages,
    [author(), author({ id: "mem-2", userId: null })]
  ).map((r) => r.authorLabel),
  ["Ada", "Bo"]
);

check(
  "one unresolvable message does not discard the batch around it",
  buildChatRows(
    parseChatBatch([
      wire(),
      wire({ id: "m2", memberId: "ghost" }),
      wire({ id: "m3" }),
    ]).messages,
    [author()]
  ).map((r) => r.id),
  ["m1", "m3"]
);

check(
  "batch order is preserved",
  buildChatRows(
    parseChatBatch([
      wire({ id: "m1" }),
      wire({ id: "m2" }),
      wire({ id: "m3" }),
    ]).messages,
    [author()]
  ).map((r) => r.id),
  ["m1", "m2", "m3"]
);

fs.rmSync(outDir, { recursive: true, force: true });

console.log(
  failures === 0
    ? `\nall ${checks} checks passed\n`
    : `\n${failures} of ${checks} check(s) failed\n`
);

process.exit(failures === 0 ? 0 : 1);
