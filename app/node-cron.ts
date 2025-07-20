import {
  addContactResendLogic,
  getContactsResendLogic,
  syncUnsubscribedContactsLogic,
} from "./controllers/suscriber.controller";
import cron from "node-cron";
import "dotenv/config";

// cada viernes a las 17:07 horas
cron.schedule(
  "* * * * *",
  async () => {
    console.log("Cron ejecutado:", new Date().toLocaleString());
    const addResult = await addContactResendLogic();
    console.log("addContactResendLogic:", addResult);

    const getResult = await getContactsResendLogic();
    console.log("getContactsResendLogic:", getResult);

    const syncResult = await syncUnsubscribedContactsLogic();
    console.log("syncUnsubscribedContactsLogic:", syncResult);
  },
  { timezone: "America/Santiago" }
);
