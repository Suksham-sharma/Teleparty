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
const GUEST_JAR = __dirname + "/.test-guest.jar";
const API = "localhost:4000";
const WS = "ws://localhost:8080";

const HOST_EMAIL = `room-sync-${Date.now()}@local.test`;

execSync(
  `curl -s -c ${JAR} -X POST ${API}/api/auth/signup ` +
    `-H 'Content-Type: application/json' -d ` +
    `'{"email":"${HOST_EMAIL}","username":"TestHost","password":"room-sync-pw"}'`
);

const createResponse = JSON.parse(
  execSync(
    `curl -s -b ${JAR} -c ${JAR} -X POST ${API}/api/rooms ` +
      `-H 'Content-Type: application/json' -d '{}'`
  ).toString()
);

if (!createResponse.room) {
  console.error("Could not create a room as the signed-in host:", createResponse);
  process.exit(1);
}

const CODE = createResponse.room.code;

const results = [];
const check = (label, ok, extra = "") => {
  results.push({ label, ok: !!ok });
  console.log(`${ok ? "ok  " : "FAIL"} ${label}`, extra);
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const post = (jar, route, body) =>
  JSON.parse(
    execSync(
      `curl -s -b ${jar} -c ${jar} -X POST ${API}${route} ` +
        `-H 'Content-Type: application/json' -d '${JSON.stringify(body)}'`
    ).toString()
  );

const get = (jar, route) =>
  JSON.parse(execSync(`curl -s -b ${jar} ${API}${route}`).toString());

const del = (jar, route) =>
  JSON.parse(
    execSync(`curl -s -b ${jar} -c ${jar} -X DELETE ${API}${route}`).toString()
  );

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

  control({ roomId: CODE, action: "pause", currentTime: "58.25" });
  await wait(600);
  const paused = last(friend, "video:update");
  check("pause carries the host's position", paused?.currentTime === "58.25");
  check("pause state propagates", paused?.isCurrentlyPlaying === false);

  control({ roomId: CODE, action: "play", currentTime: "58.25" });
  await wait(600);
  const resumed = last(friend, "video:update");
  check("resume carries the host's position", resumed?.currentTime === "58.25");
  check("resume state propagates", resumed?.isCurrentlyPlaying === true);

  const afterResume = await open("m-ar", "Kabir", "VIEWER");
  await wait(300);
  check(
    "a joiner arriving after a resume lands on the resume position",
    first(afterResume, "room:snapshot")?.currentTime === "58.25"
  );
  afterResume.close();
  await wait(400);

  // A second tab from an existing member must not double-count them.
  const secondTab = await open("m-friend", "Aditi", "VIEWER");
  await wait(300);
  check(
    "a second tab does not duplicate the member",
    last(host, "room:presence")?.members?.filter((m) => m.memberId === "m-friend").length === 1
  );
  secondTab.close();
  await wait(300);

  const YOUTUBE_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const pasted = post(JAR, `/api/rooms/${CODE}/source`, { url: YOUTUBE_URL });
  check(
    "a pasted youtube link becomes a playable video",
    pasted.video?.source === "YOUTUBE" && pasted.video?.url === YOUTUBE_URL
  );

  await wait(600);
  check(
    "the pasted film is broadcast to the room",
    last(friend, "video:update")?.videoId === pasted.video?.id
  );

  const roomAfterPaste = JSON.parse(
    execSync(`curl -s -b ${JAR} ${API}/api/rooms/${CODE}`).toString()
  );
  check(
    "the room snapshot resolves the pasted url",
    roomAfterPaste.room?.currentVideo?.url === YOUTUBE_URL
  );

  check(
    "a link nothing can play is refused",
    typeof post(JAR, `/api/rooms/${CODE}/source`, {
      url: "https://example.com/some/page",
    }).error === "string"
  );

  post(GUEST_JAR, `/api/rooms/${CODE}/join`, { displayName: "Passerby" });
  const denied = post(GUEST_JAR, `/api/rooms/${CODE}/source`, {
    url: YOUTUBE_URL,
  });
  check(
    "a viewer cannot change what the room is watching",
    !denied.video && typeof denied.error === "string",
    `(${denied.error})`
  );

  const QUEUE_A = "https://films.example/queue-one.mp4";
  const QUEUE_B = "https://films.example/queue-two.mp4";
  const SUGGESTED = "https://films.example/suggested.mp4";

  const queuedByHost = post(JAR, `/api/rooms/${CODE}/queue`, { url: QUEUE_A });
  check(
    "a controller's addition lands in the queue directly",
    queuedByHost.item?.status === "QUEUED"
  );

  post(JAR, `/api/rooms/${CODE}/queue`, { url: QUEUE_B });

  const suggested = post(GUEST_JAR, `/api/rooms/${CODE}/queue`, {
    url: SUGGESTED,
  });
  check(
    "a viewer's addition lands as a suggestion",
    suggested.item?.status === "SUGGESTED"
  );

  const beforeApproval = get(JAR, `/api/rooms/${CODE}`).room;
  check(
    "suggestions are kept out of the queue proper",
    beforeApproval.queue.length === 2 && beforeApproval.suggestions.length === 1
  );
  check(
    "a suggestion carries who asked for it",
    beforeApproval.suggestions[0]?.addedByName === "Passerby",
    `(${beforeApproval.suggestions[0]?.addedByName})`
  );

  check(
    "a viewer cannot approve their own suggestion",
    typeof post(GUEST_JAR, `/api/rooms/${CODE}/queue/${suggested.item.id}/approve`, {})
      .error === "string"
  );

  post(JAR, `/api/rooms/${CODE}/queue/${suggested.item.id}/approve`, {});
  const afterApproval = get(JAR, `/api/rooms/${CODE}`).room;
  check(
    "the host's approval moves it into the queue, last",
    afterApproval.queue.length === 3 &&
      afterApproval.suggestions.length === 0 &&
      afterApproval.queue[2].video.sourceUrl === undefined &&
      afterApproval.queue[2].video.url === SUGGESTED
  );

  check(
    "a viewer cannot remove someone else's queue item",
    typeof del(GUEST_JAR, `/api/rooms/${CODE}/queue/${queuedByHost.item.id}`)
      .error === "string"
  );

  const currentBefore = get(JAR, `/api/rooms/${CODE}`).room.currentVideoId;
  const advanced = post(JAR, `/api/rooms/${CODE}/next`, {
    afterVideoId: currentBefore,
  });
  check(
    "the queue advances to its head",
    advanced.advanced === true && advanced.video?.url === QUEUE_A
  );

  await wait(600);
  check(
    "the room is told the film changed",
    last(friend, "video:update")?.videoId === advanced.video.id
  );

  const afterAdvance = get(JAR, `/api/rooms/${CODE}`).room;
  check(
    "the played item leaves the queue",
    afterAdvance.currentVideo?.url === QUEUE_A && afterAdvance.queue.length === 2
  );

  check(
    "an advance for a film the room has already left is refused",
    post(JAR, `/api/rooms/${CODE}/next`, { afterVideoId: currentBefore })
      .advanced === false
  );

  check(
    "a viewer cannot advance the queue",
    typeof post(GUEST_JAR, `/api/rooms/${CODE}/next`, {}).error === "string"
  );

  const spam = [];
  for (let i = 0; i < 7; i++) {
    spam.push(
      post(GUEST_JAR, `/api/rooms/${CODE}/queue`, {
        url: `https://films.example/spam-${i}.mp4`,
      })
    );
  }
  check(
    "a viewer's pending suggestions are capped",
    spam.filter((r) => r.item).length === 5 &&
      spam.filter((r) => r.error).length === 2
  );

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

  const hostMembership = get(JAR, `/api/rooms/${CODE}`).membership;
  const guestMembership = post(GUEST_JAR, `/api/rooms/${CODE}/join`, {
    displayName: "Passerby",
  }).membership;

  const realHost = await open(hostMembership.id, "Suksham", "HOST");
  const realGuest = await open(guestMembership.id, "Passerby", "VIEWER");

  realHost.send(
    JSON.stringify({ type: "chat:message", roomId: CODE, chatMessage: "who is in?" })
  );
  await wait(20);
  realGuest.send(
    JSON.stringify({ type: "chat:message", roomId: CODE, chatMessage: "me, one sec" })
  );

  await wait(1500);

  const history = get(JAR, `/api/rooms/${CODE}/messages`).messages ?? [];
  const bodies = history.map((m) => m.body);

  check(
    "chat survives the socket — both lines are in Postgres",
    bodies.includes("who is in?") && bodies.includes("me, one sec"),
    `(${bodies.length} persisted)`
  );
  check(
    "history keeps the order the room said things in",
    bodies.indexOf("who is in?") < bodies.indexOf("me, one sec")
  );
  check(
    "a persisted line carries the member who sent it",
    history.find((m) => m.body === "me, one sec")?.memberId === guestMembership.id
  );
  check(
    "a guest's line persists under their display name",
    history.find((m) => m.body === "me, one sec")?.authorLabel === "Passerby"
  );
  check(
    "a chat line from an unknown member is never written",
    !bodies.includes("starting in 2")
  );

  const memberIn = (jar, id) =>
    get(jar, `/api/rooms/${CODE}`).room.members.find((m) => m.id === id);

  post(GUEST_JAR, `/api/rooms/${CODE}/control-request`, {});
  check(
    "a viewer's ask for control is recorded",
    Boolean(memberIn(JAR, guestMembership.id).controlRequestedAt)
  );

  const askedAt = memberIn(JAR, guestMembership.id).controlRequestedAt;
  post(GUEST_JAR, `/api/rooms/${CODE}/control-request`, {});
  check(
    "asking twice does not queue a second request",
    memberIn(JAR, guestMembership.id).controlRequestedAt === askedAt
  );

  check(
    "the host has nothing to ask for",
    post(JAR, `/api/rooms/${CODE}/control-request`, {}).error ===
      "You already control this room."
  );

  check(
    "a viewer cannot answer someone else's request",
    del(GUEST_JAR, `/api/rooms/${CODE}/control-request/${hostMembership.id}`)
      .error === "Only the host decides this."
  );

  del(GUEST_JAR, `/api/rooms/${CODE}/control-request/${guestMembership.id}`);
  check(
    "the asker can withdraw their own request",
    memberIn(JAR, guestMembership.id).controlRequestedAt === null
  );

  post(GUEST_JAR, `/api/rooms/${CODE}/control-request`, {});
  post(JAR, `/api/rooms/${CODE}/role`, {
    memberId: guestMembership.id,
    role: "COHOST",
  });
  const promoted = memberIn(JAR, guestMembership.id);
  check("the host's approval promotes the asker", promoted.role === "COHOST");
  check(
    "approving clears the request rather than leaving it pending",
    promoted.controlRequestedAt === null
  );

  check(
    "a co-host cannot promote anyone else",
    post(GUEST_JAR, `/api/rooms/${CODE}/role`, {
      memberId: hostMembership.id,
      role: "COHOST",
    }).error === "Only the host can do that."
  );

  post(JAR, `/api/rooms/${CODE}/role`, {
    memberId: guestMembership.id,
    role: "VIEWER",
  });
  check(
    "the host can demote a co-host again",
    memberIn(JAR, guestMembership.id).role === "VIEWER"
  );

  check(
    "declining a request nobody made is refused",
    del(GUEST_JAR, `/api/rooms/${CODE}/control-request/${guestMembership.id}`)
      .error === "No request to answer."
  );

  const kicked = await open(guestMembership.id, "Passerby", "VIEWER");
  await wait(300);
  const rosterBefore = last(realHost, "room:presence")?.members?.length ?? 0;

  check(
    "a viewer cannot remove anyone",
    typeof del(GUEST_JAR, `/api/rooms/${CODE}/members/${hostMembership.id}`)
      .error === "string"
  );

  check(
    "the host cannot remove themselves",
    del(JAR, `/api/rooms/${CODE}/members/${hostMembership.id}`).error ===
      "The host cannot remove themselves."
  );

  del(JAR, `/api/rooms/${CODE}/members/${guestMembership.id}`);
  await wait(500);

  check(
    "a removed member is told they are out",
    Boolean(first(kicked, "room:removed"))
  );
  check(
    "a removed member leaves the roster",
    (last(realHost, "room:presence")?.members?.length ?? 0) < rosterBefore
  );
  check(
    "a removed member is gone from the room's members",
    !get(JAR, `/api/rooms/${CODE}`).room.members.some(
      (m) => m.id === guestMembership.id
    )
  );
  check(
    "a removed member cannot rejoin on the same link",
    post(GUEST_JAR, `/api/rooms/${CODE}/join`, { displayName: "Passerby" })
      .error === "You were removed from this room."
  );
  check(
    "a removed member cannot act on the room either",
    typeof post(GUEST_JAR, `/api/rooms/${CODE}/control-request`, {}).error ===
      "string"
  );
  check(
    "what they said stays in the chat",
    get(JAR, `/api/rooms/${CODE}/messages`).messages.some(
      (m) => m.body === "me, one sec"
    )
  );
  check(
    "removing someone twice is refused",
    del(JAR, `/api/rooms/${CODE}/members/${guestMembership.id}`).error ===
      "Member not found."
  );

  kicked.close();
  realHost.close();
  realGuest.close();

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
