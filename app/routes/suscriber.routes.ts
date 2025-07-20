import {
  createSuscriber,
  getContactsResend,
  getSuscribers,
  sendNewsletter,
  syncUnsubscribedContacts,
} from "../controllers/suscriber.controller";
import { Router } from "express";
const router = Router();

router.post("/create", createSuscriber);
router.get("/", getSuscribers);
router.post("/send-newsletter", sendNewsletter);
// router.post("/add-contact-resend", addContactResend);
//esta ruta tiene que ser llamada primero que sync-resend
router.get("/get-contacts-resend", getContactsResend);
// sincroniza los contactos de Resend con los suscriptores en la base de datos
//tiene que ser llamada después de get-contacts-resend
router.get("/sync-resend", syncUnsubscribedContacts);

export default router;
