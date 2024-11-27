import express from "express";
import { apiRouterV1 } from "./routes";
import cookieParser from "cookie-parser";

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use("/api", apiRouterV1);

app.get("/", (req, res) => {
  res.status(200).json({ message: "Hello World" });
});

app.listen(3000, () => {
  console.log("Server Started at Port 3000");
});
