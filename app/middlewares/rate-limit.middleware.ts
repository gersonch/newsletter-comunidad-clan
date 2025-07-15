import rateLimit from "express-rate-limit";

export const suscriberRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // máximo 5 solicitudes por minuto por IP
  message: { message: "Demasiadas solicitudes, intenta más tarde." },
});
