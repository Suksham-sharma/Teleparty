import { Router } from "express";

import { authRouter } from "./auth";
import { channelRouter } from "./channel";
import { videosRouter } from "./videos";
import { roomsRouter } from "./rooms";
import { protectRoute } from "../middleware/middleware";
import { resolveIdentity } from "../middleware/identity";

export const apiRouterV1 = Router();

apiRouterV1.use("/auth", authRouter);

// Rooms are guest-accessible: resolveIdentity recognises a signed-in user or
// mints a guestId cookie, but never rejects.
apiRouterV1.use("/rooms", resolveIdentity, roomsRouter);

// Playback control is authorized by room membership inside the handlers.
apiRouterV1.use("/videos", resolveIdentity, videosRouter);

// Channels remain a signed-in-only library.
apiRouterV1.use("/channels", protectRoute, channelRouter);
