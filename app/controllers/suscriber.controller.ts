import suscriberSchema from "../config/suscriber.schema";
import { checkEmailService } from "../services/email-checker.service";
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
  const apiKey = process.env.CHECKERMAIL_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ message: "API Key not configured" });
  }

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
  const data = await checkEmailService(email, apiKey);
  if (data.status !== "valid") {
    return res.status(400).json({ message: "El email no es válido" });
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
  // 1. Obtener todos los suscriptores activos de la base de datos
  const subscribers: IResendResponse[] = await suscriberSchema.find({
    isSuscribed: true,
  });
  if (subscribers.length === 0) {
    return res.status(404).json({ message: "No subscribers found" });
  }

  try {
    // 2. Obtener todos los contactos existentes en Resend para ese audienceId
    //    (esto puede paginar, aquí solo se obtiene la primera página, ajusta si tienes muchos contactos)
    const existingContacts = await resend.contacts.list({ audienceId });
    let newSubscribers: IResendResponse[] = subscribers;
    let existingEmails: string[] = [];
    // Si hay contactos en Resend, filtrar solo los nuevos
    if (
      existingContacts.data &&
      Array.isArray(existingContacts.data.data) &&
      existingContacts.data.data.length > 0
    ) {
      existingEmails = existingContacts.data.data.map((c: any) => c.email);
      newSubscribers = subscribers.filter(
        (s) => !existingEmails.includes(s.email)
      );
    }

    // Crear todos si no hay contactos en Resend, o solo los nuevos si existen
    for (const subscriber of newSubscribers) {
      await resend.contacts.create({
        audienceId,
        email: subscriber.email,
        unsubscribed: false,
      });
    }

    return res.status(200).json({
      message: `Contacts added successfully: ${newSubscribers.length}`,
      added: newSubscribers.map((s) => s.email),
      skipped: subscribers.length - newSubscribers.length,
    });
  } catch (error) {
    // Si ocurre un error, devolver el mensaje y el error
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
      from: "Comunidad Clan <comunidadclan@comunidadclan.cl>",
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

// Obtiene los contactos de Resend y actualiza los suscriptores en la base de datos
// con el estado de suscripción basado en los datos de Resend
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

    const contactResponses = await resend.contacts.list({
      audienceId,
    });

    if (
      !contactResponses ||
      !contactResponses.data ||
      !Array.isArray(contactResponses.data.data) ||
      contactResponses.data.data.length === 0
    ) {
      return res.status(404).json({ message: "No contacts found" });
    }
    if (contactResponses.data.data.length < suscribers.length) {
      console.warn(
        "La cantidad de contactos recibida de Resend es menor que la de la base de datos. Verificar si hay un límite en la API."
      );
    }
    // Get all emails in DB in lowercase for comparison
    const emailsInDb = suscribers.map((s: any) => s.email.trim().toLowerCase());

    const validContacts = contactResponses.data.data.filter((c: any) =>
      emailsInDb.includes(c.email.trim().toLowerCase())
    );

    const bulkUpdates = validContacts.map((c) => ({
      updateOne: {
        filter: { email: c.email },
        update: { $set: { isSuscribed: c.unsubscribed === false } },
      },
    }));

    // funcion para sincronizar base de datos con Resend
    // si base de datos tiene isSuscribed = true, pero Resend tiene unsubscribed = true, actualizar unSuscribed a false
    const unsubscribeUpdates = suscribers.filter(
      (s) =>
        s.isSuscribed &&
        validContacts.some((c) => c.email === s.email && c.unsubscribed)
    );

    for (const subscriber of unsubscribeUpdates) {
      await resend.contacts.update({
        email: subscriber.email,
        audienceId,
        unsubscribed: false, // Actualizar a unsubscribed
      });
    }
    // 4. Ejecutar actualizaciones si hay
    if (bulkUpdates.length > 0) {
      await suscriberSchema.bulkWrite(bulkUpdates);
    }

    return res.status(200).json({
      message: "Contacts processed successfully",
      contacts: validContacts,
      updatedCount: bulkUpdates.length,
      unsubscribedCount: unsubscribeUpdates.length,
    });
  } catch (error) {
    console.error("Error in getContactsResend:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
