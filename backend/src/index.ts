import express from "express";
import { apiRouterV1 } from "./routes";
import cookieParser from "cookie-parser";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use(cors({ credentials: true, origin: "http://localhost:3000" }));

app.use("/api", apiRouterV1);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});

app.listen(4000, () => {
  console.log("Server Started at Port 3000");
});
