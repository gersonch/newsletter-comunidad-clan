import {
  createSuscriber,
  getSuscribers,
} from "../controllers/suscriber.controller";
import { Router } from "express";
const router = Router();

router.post("/create", createSuscriber);
router.get("/", getSuscribers);

export default router;
