/**
 * End-to-end sync check for the room protocol.
 *
 * Requires the API (:4000), ws-server (:8080), Postgres and Redis to be up:
 *
 *   node test/room-sync.js
 *
 * Creates its own room each run so roster assertions aren't perturbed by
 * whoever else happens to be connected.
 */
const WebSocket = require("ws");
const { execSync } = require("child_process");

const JAR = __dirname + "/.test-host.jar";
const API = "localhost:4000";
const WS = "ws://localhost:8080";

const CODE = JSON.parse(
  execSync(
    `curl -s -c ${JAR} -X POST ${API}/api/rooms ` +
      `-H 'Content-Type: application/json' -d '{"hostName":"TestHost"}'`
  ).toString()
).room.code;

const results = [];
const check = (label, ok, extra = "") => {
  results.push({ label, ok: !!ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`, extra);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const control = (body) =>
  execSync(
    `curl -s -b ${JAR} -X POST ${API}/api/videos/interaction/vid1 ` +
      `-H 'Content-Type: application/json' -d '${JSON.stringify(body)}'`
  );

function open(memberId, name, role) {
  return new Promise((resolve) => {
    const ws = new WebSocket(WS);
    ws.received = [];
    ws.on("message", (raw) => ws.received.push(JSON.parse(raw.toString())));
    ws.on("open", () => {
      ws.send(JSON.stringify({ type: "room:join", roomId: CODE, memberId, name, role }));
      setTimeout(() => resolve(ws), 300);
    });
  });
}

const last = (ws, type) => ws.received.filter((m) => m.type === type).pop();
const first = (ws, type) => ws.received.find((m) => m.type === type);

(async () => {
  console.log(`room ${CODE}\n`);

  const host = await open("m-host", "Suksham", "HOST");
  const snapshot = first(host, "room:snapshot");
  check("host receives a snapshot on join", snapshot);
  check("snapshot carries the roster", snapshot?.members?.length === 1);

  const friend = await open("m-friend", "Aditi", "VIEWER");
  await wait(300);
  check("joiner's snapshot has the full roster", first(friend, "room:snapshot")?.members?.length === 2);
  check("existing members are told of the join", first(host, "room:join"));
  check("presence is broadcast", first(host, "room:presence"));

  host.send(JSON.stringify({ type: "chat:message", roomId: CODE, chatMessage: "starting in 2" }));
  await wait(300);
  const chat = first(friend, "chat:message");
  check("chat reaches other members", chat?.body === "starting in 2", `(from ${chat?.name})`);

  const late = await open("m-late", "Rohit", "VIEWER");
  await wait(300);
  check("late joiner receives chat history", first(late, "room:snapshot")?.messages?.length === 1);

  control({ roomId: CODE, action: "play" });
  await wait(600);
  const update = last(friend, "video:update");
  check("API -> Redis -> WS relay reaches viewers", update);
  check("play state propagates", update?.isCurrentlyPlaying === true);

  control({ roomId: CODE, action: "timestamp", currentTime: "42.5" });
  await wait(600);
  check("seek position propagates", last(friend, "video:update")?.currentTime === "42.5");

  const veryLate = await open("m-vl", "Meera", "VIEWER");
  await wait(300);
  const vlSnap = first(veryLate, "room:snapshot");
  check("late joiner lands at the current position", vlSnap?.currentTime === "42.5");
  check("late joiner knows playback is running", vlSnap?.isCurrentlyPlaying === true);

  // A second tab from an existing member must not double-count them.
  const secondTab = await open("m-friend", "Aditi", "VIEWER");
  await wait(300);
  check(
    "a second tab does not duplicate the member",
    last(host, "room:presence")?.members?.filter((m) => m.memberId === "m-friend").length === 1
  );
  secondTab.close();
  await wait(300);

  friend.send(JSON.stringify({ type: "chat:message", roomId: CODE }));
  await wait(300);
  check(
    "a malformed frame errors without closing the socket",
    first(friend, "error") && friend.readyState === WebSocket.OPEN
  );

  const before = host.received.filter((m) => m.type === "room:leave").length;
  late.close();
  veryLate.close();
  await wait(500);
  check("disconnect broadcasts a leave", host.received.filter((m) => m.type === "room:leave").length > before);
  check("roster shrinks on leave", last(host, "room:presence")?.members?.length === 2);

  const failed = results.filter((r) => !r.ok);
  console.log(
    failed.length === 0
      ? `\nall ${results.length} checks passed`
      : `\n${failed.length}/${results.length} failed`
  );

  host.close();
  friend.close();
  process.exit(failed.length === 0 ? 0 : 1);
})();
