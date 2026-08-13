import { Router, Request, Response } from "express";
import { emailService } from "./services/email-service";

export const notificationsRouter = Router();

notificationsRouter.post("/send-email", async (req: Request, res: Response) => {
  const { to, subject, clientName, documentType, documentId, verificationCode, documentUrl } = req.body;

  if (!to || !subject) {
    return res.status(400).json({ success: false, error: "Faltan campos requeridos: to, subject" });
  }

  const resolvedUrl = documentUrl || `https://vecinoxpress.cl/verificar/${documentId}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #EC1C24; color: white; padding: 20px; text-align: center;">
        <h1 style="margin: 0;">CerfiDoc</h1>
      </div>

      <div style="padding: 20px; border: 1px solid #ddd; border-top: none;">
        <h2>Notificación de Documento</h2>
        <p>Estimado/a ${clientName || "Usuario"}:</p>

        <p>Le informamos que su documento ha sido procesado correctamente.</p>

        <div style="background-color: #f8f8f8; padding: 15px; margin: 15px 0; border-left: 4px solid #EC1C24;">
          ${documentType ? `<p><strong>Tipo de documento:</strong> ${documentType}</p>` : ""}
          ${documentId ? `<p><strong>ID de Documento:</strong> ${documentId}</p>` : ""}
          ${verificationCode ? `<p><strong>Código de verificación:</strong> ${verificationCode}</p>` : ""}
        </div>

        <div style="text-align: center; margin: 25px 0;">
          <a href="${resolvedUrl}" style="background-color: #EC1C24; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px;">
            Ver documento
          </a>
        </div>

        <p>Si tiene alguna consulta, contáctenos a través de nuestro centro de soporte.</p>

        <p>Atentamente,<br/><strong>Equipo CerfiDoc</strong></p>
      </div>

      <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
        <p>© ${new Date().getFullYear()} CerfiDoc. Todos los derechos reservados.</p>
        <p>Este es un correo automático, por favor no responda a esta dirección.</p>
      </div>
    </div>
  `;

  const sent = await emailService.sendEmail({ to, subject, html });
  res.json({ success: sent });
});
