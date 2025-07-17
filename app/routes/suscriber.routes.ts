import {
  addContactResend,
  createSuscriber,
  getContactsResend,
  getSuscribers,
  sendNewsletter,
} from "../controllers/suscriber.controller";
import { Router } from "express";
const router = Router();

router.post("/create", createSuscriber);
router.get("/", getSuscribers);
router.post("/send-newsletter", sendNewsletter);
router.post("/add-contact-resend", addContactResend);
router.get("/get-contacts-resend", getContactsResend);

export default router;
