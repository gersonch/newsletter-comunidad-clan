import suscriberSchema from "../config/suscriber.schema";
import { checkEmailService } from "../services/email-checker.service";
import { ISubscriber } from "../types/suscriber";
import { Request, Response } from "express";
import { Resend } from "resend";
import emailTemplate from "../template/email-template";
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
      html: emailTemplate,
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

// ...importaciones y definiciones previas...

// Lógica interna para node-cron y controllers
export const addContactResendLogic = async () => {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  const subscribers: IResendResponse[] = await suscriberSchema.find({
    isSuscribed: true,
  });
  if (!audienceId) {
    return { status: 500, data: { message: "Audience ID not configured" } };
  }
  if (subscribers.length === 0) {
    return { status: 404, data: { message: "No subscribers found" } };
  }
  try {
    const existingContacts = await resend.contacts.list({ audienceId });
    let newSubscribers: IResendResponse[] = subscribers;
    let existingEmails: string[] = [];
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
    for (const subscriber of newSubscribers) {
      await resend.contacts.create({
        audienceId,
        email: subscriber.email,
        unsubscribed: false,
      });
    }
    return {
      status: 200,
      data: {
        message: `Contacts added successfully: ${newSubscribers.length}`,
        added: newSubscribers.map((s) => s.email),
        skipped: subscribers.length - newSubscribers.length,
      },
    };
  } catch (error) {
    return { status: 500, data: { message: "Error adding contacts", error } };
  }
};

export const getContactsResendLogic = async () => {
  const suscribers = await suscriberSchema.find();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (suscribers.length === 0) {
    return { status: 404, data: { message: "No subscribers found" } };
  }
  if (!audienceId) {
    return { status: 500, data: { message: "Audience ID not configured" } };
  }
  const contactResponses = await resend.contacts.list({ audienceId });
  if (
    !contactResponses ||
    !contactResponses.data ||
    !Array.isArray(contactResponses.data.data) ||
    contactResponses.data.data.length === 0
  ) {
    return { status: 404, data: { message: "No contacts found" } };
  }
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
  if (bulkUpdates.length > 0) {
    await suscriberSchema.bulkWrite(bulkUpdates);
  }
  return {
    status: 200,
    data: {
      message: "Contacts processed successfully",
      contacts: validContacts,
      updatedCount: bulkUpdates.length,
    },
  };
};

export const syncUnsubscribedContactsLogic = async () => {
  const suscribers = await suscriberSchema.find();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const audienceId = process.env.RESEND_AUDIENCE_ID;
  if (!audienceId) {
    return { status: 500, data: { message: "Audience ID not configured" } };
  }
  const contactResponses = await resend.contacts.list({ audienceId });
  if (
    !contactResponses ||
    !contactResponses.data ||
    !Array.isArray(contactResponses.data.data)
  ) {
    return { status: 404, data: { message: "No contacts found" } };
  }
  const validContacts = contactResponses.data.data;
  const unsubscribeUpdates = suscribers.filter(
    (s) =>
      s.isSuscribed &&
      validContacts.some((c: any) => c.email === s.email && c.unsubscribed)
  );
  let updatedCount = 0;
  for (const subscriber of unsubscribeUpdates) {
    await resend.contacts.update({
      email: subscriber.email,
      audienceId,
      unsubscribed: false,
    });
    updatedCount++;
  }
  return {
    status: 200,
    data: {
      message: "Unsubscribed contacts synchronized successfully",
      updatedCount,
      emails: unsubscribeUpdates.map((s) => s.email),
    },
  };
};

// Controllers Express
export const addContactResend = async (req: Request, res: Response) => {
  const result = await addContactResendLogic();
  return res.status(result.status).json(result.data);
};

export const getContactsResend = async (req: Request, res: Response) => {
  const result = await getContactsResendLogic();
  return res.status(result.status).json(result.data);
};

export const syncUnsubscribedContacts = async (req: Request, res: Response) => {
  const result = await syncUnsubscribedContactsLogic();
  return res.status(result.status).json(result.data);
};

// ...resto de tus controllers y código...
