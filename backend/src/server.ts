import dotenv from "dotenv";
import express, { Request, Response } from "express";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

