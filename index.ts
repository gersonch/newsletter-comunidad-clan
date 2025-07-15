import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { connectDB } from "./app/config/db.config";
import suscriberRoutes from "./app/routes/suscriber.routes";

// configures dotenv to work in your application
dotenv.config();
const app = express();
app.use(express.json());

const PORT = process.env.PORT;

connectDB();

app.use("/suscribers", suscriberRoutes);

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
