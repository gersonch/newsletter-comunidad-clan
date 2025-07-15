import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { connectDB } from "./app/config/db.config";
import suscriberRoutes from "./app/routes/suscriber.routes";
import { checkApiKey } from "./app/middlewares/api-key.middleware";
import cors from "cors";
import { suscriberRateLimiter } from "./app/middlewares/rate-limit.middleware";

// configures dotenv to work in your application
dotenv.config();
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

const PORT = process.env.PORT;

connectDB();

app.use("/suscribers", suscriberRateLimiter, checkApiKey, suscriberRoutes);

app.get("/", (request: Request, response: Response) => {
  response.status(200).send("Hello World");
});

app
  .listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
  })
  .on("error", (error) => {
    // gracefully handle error
    throw new Error(error.message);
  });
