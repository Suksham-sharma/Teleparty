import { Router } from "express";

import { authRouter } from "./auth";
import { channelRouter } from "./channel";
import { videosRouter } from "./videos";
import { protectRoute } from "../middleware/middleware";

export const JWT_SECRET = "secret";
export const apiRouterV1 = Router();

apiRouterV1.use("/auth", authRouter);
apiRouterV1.use("/channels", protectRoute, channelRouter);
apiRouterV1.use("/videos", protectRoute, videosRouter);
