import suscriberSchema from "../config/suscriber.schema";
import { ISubscriber } from "../types/suscriber";
import { Request, Response } from "express";

export const createSuscriber = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: "El email es requerido" });
  }
  const suscriberExists = await suscriberSchema.findOne({ email });
  if (suscriberExists && suscriberExists.isSuscribed) {
    return res
      .status(400)
      .json({ message: "Ya estas suscrito con este correo" });
  }

  if (suscriberExists && !suscriberExists.isSuscribed) {
    suscriberExists.isSuscribed = true;
    await suscriberExists.save();
    return res.status(200).json({ message: "Suscripción reactivada" });
  }

  try {
    const newSuscriber = new suscriberSchema({
      email,
      isSuscribed: true,
    });
    await newSuscriber.save();
    return res.status(201).json({
      message: "Suscripción exitosa",
      suscriber: newSuscriber,
    });
  } catch (error) {
    return res.status(500).json({ message: "Error creating subscriber" });
  }
};

export const getSuscribers = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    // solo isSuscribed suscribers
    const suscribers: ISubscriber[] = await suscriberSchema.find({
      isSuscribed: true,
    });
    if (suscribers.length === 0) {
      return res.status(404).json({ message: "No subscribers found" });
    }

    return res.status(200).json(suscribers);
  } catch (error) {
    return res.status(500).json({ message: "Error fetching subscribers" });
  }
};
