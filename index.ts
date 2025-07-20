import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { connectDB } from "./app/config/db.config";
import suscriberRoutes from "./app/routes/suscriber.routes";
import { checkApiKey } from "./app/middlewares/api-key.middleware";
import cors from "cors";
import { suscriberRateLimiter } from "./app/middlewares/rate-limit.middleware";
import cron from "node-cron";
import {
  getContactsResendLogic,
  syncUnsubscribedContactsLogic,
} from "./app/controllers/suscriber.controller";

// configures dotenv to work in your application
dotenv.config();
const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "http://localhost:4321",
    methods: ["GET", "POST"],
  })
);

const PORT = process.env.PORT;

connectDB();

app.use("/suscribers", suscriberRateLimiter, checkApiKey, suscriberRoutes);

app.get("/", (request: Request, response: Response) => {
  response.status(200).send("Hello World");
});

cron.schedule(
  "0 0 * * 4", // jueves a las 00:00 horas
  async () => {
    console.log("Cron ejecutado:", new Date().toLocaleString());
    // const addResult = await addContactResendLogic();
    // console.log("addContactResendLogic:", addResult);

    const getResult = await getContactsResendLogic();
    console.log("getContactsResendLogic:", getResult);

    const syncResult = await syncUnsubscribedContactsLogic();
    console.log("syncUnsubscribedContactsLogic:", syncResult);
  },
  { timezone: "America/Santiago" }
);

app
  .listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
  })
  .on("error", (error) => {
    // gracefully handle error
    throw new Error(error.message);
  });
