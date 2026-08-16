import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { apiRouterV1 } from "./routes";
import { CORS_ORIGIN, PORT } from "./lib/config";
import { transcodeStatusConsumer } from "./lib/transcodeStatus";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: CORS_ORIGIN }));

app.use("/api", apiRouterV1);

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`API listening on :${PORT}`);
});

// The return leg of the transcode pipeline. Started after listen so a Redis
// outage delays status updates rather than the whole API.
void transcodeStatusConsumer.start();
