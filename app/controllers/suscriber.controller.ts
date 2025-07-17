import suscriberSchema from "../config/suscriber.schema";
import { ISubscriber } from "../types/suscriber";
import { Request, Response } from "express";
import { Resend } from "resend";

interface IResendResponse extends ISubscriber {
  _id: string;
}

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

export const addContactResend = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return res.status(500).json({ message: "Audience ID not configured" });
  }
  const subscribers: IResendResponse[] = await suscriberSchema.find({
    isSuscribed: true,
  });
  if (subscribers.length === 0) {
    return res.status(404).json({ message: "No subscribers found" });
  }

  try {
    for (const subscriber of subscribers) {
      await resend.contacts.create({
        audienceId,
        email: subscriber.email,
        unsubscribed: false,
      });
    }
    return res.status(200).json({ message: "Contacts added successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Error adding contacts", error });
  }
};

export const sendNewsletter = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;

  if (!audienceId) {
    return res.status(500).json({ message: "Audience ID not configured" });
  }
  try {
    const broadcast = await resend.broadcasts.create({
      audienceId: audienceId,
      from: "Comunidad-Clan <comunidadclan@comunidadclan.cl>",
      subject: "hello world",
      html: "Hi {{{FIRST_NAME|there}}}, you can unsubscribe here: {{{RESEND_UNSUBSCRIBE_URL}}}",
    });
    if (!broadcast) {
      return res.status(404).json({ message: "No broadcast created" });
    }
    const broadcastId = broadcast.data?.id;
    console.log("Broadcast ID:", broadcastId);

    if (!broadcastId) {
      return res.status(500).json({ message: "Broadcast ID is undefined" });
    }

    const sendNewsletter = await resend.broadcasts.send(broadcastId);

    if (!sendNewsletter) {
      return res.status(404).json({ message: "No broadcast sent" });
    }
    return res
      .status(200)
      .json({ message: "Newsletter sent successfully", sendNewsletter });
  } catch (error) {
    return res.status(500).json({ message: "Error sending newsletter", error });
  }
};

export const getContactsResend = async (
  req: Request,
  res: Response
): Promise<Response | void> => {
  try {
    const suscribers = await suscriberSchema.find();
    const resend = new Resend(process.env.RESEND_API_KEY);
    const audienceId = process.env.RESEND_AUDIENCE_ID;

    if (suscribers.length === 0) {
      return res.status(404).json({ message: "No subscribers found" });
    }

    if (!audienceId) {
      return res.status(500).json({ message: "Audience ID not configured" });
    }

    // 1. obtencion de contactos desde Resend
    // Usamos Promise.allSettled para manejar errores individuales sin detener todo el proceso
    //
    // Esto es útil si algunos contactos no existen en Resend, pero queremos seguir procesando
    const contactResponses = await Promise.allSettled(
      suscribers.map((s) =>
        resend.contacts.get({
          email: s.email,
          audienceId,
        })
      )
    );

    // 2. Filtrar los contactos válidos

    // cuando es fulfilled, el valor es un objeto con una propiedad data
    // y cuando es rejected, no tiene esa propiedad
    const validContacts = contactResponses
      .filter((r) => r.status === "fulfilled" && r.value?.data)
      .map((r) => (r as PromiseFulfilledResult<any>).value.data);

    if (validContacts.length === 0) {
      return res.status(404).json({ message: "No contacts found" });
    }

    // 3. Preparar operaciones en lote para Mongo
    // filtramos desde los contactos obtenidos de Resend
    // Solo actualizamos los que están unsubscribed(true)
    const bulkUpdates = validContacts
      .filter((c) => c.unsubscribed)
      .map((c) => ({
        updateOne: {
          filter: { email: c.email },
          update: { $set: { isSuscribed: false } },
        },
      }));

    // 4. Ejecutar actualizaciones si hay
    if (bulkUpdates.length > 0) {
      await suscriberSchema.bulkWrite(bulkUpdates);
    }

    return res.status(200).json({
      message: "Contacts processed successfully",
      contacts: validContacts,
      unsubscribedCount: bulkUpdates.length,
    });
  } catch (error) {
    console.error("Error in getContactsResend:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
