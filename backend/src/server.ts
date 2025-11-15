import "dotenv/config";
import express, { Request, Response } from "express";
import agentRouter from "./routers/agent.router";

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Agent routes
app.use("/agent", agentRouter);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

