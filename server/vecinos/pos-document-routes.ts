import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import QRCode from 'qrcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { pool } from '../db';
import { validateRut, formatRut } from '@shared/utils/rut';
import { isRegionValida } from '@shared/utils/regiones';

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'vecinos-secret-key';
const COMMISSION_RATE = Number(process.env.COMISSION_RATE || 20) / 100;

// Tipos de documento disponibles en el POS (precio en CLP).
const DOCUMENT_TYPES = [
  { id: 'declaracion-jurada', name: 'Declaración Jurada Simple', price: 3990 },
  { id: 'poder-simple', name: 'Poder Simple', price: 4990 },
  { id: 'autorizacion-viaje', name: 'Autorización de Viaje', price: 5990 },
  { id: 'finiquito', name: 'Finiquito Laboral', price: 6990 },
  { id: 'contrato-arriendo', name: 'Contrato de Arriendo', price: 8990 },
];

interface AgentPayload {
  id: number;
  username: string;
  role: string;
}

// Verifica el JWT del agente Vecinos (emitido por POST /api/vecinos/login).
function authenticateAgent(
  req: express.Request & { agent?: AgentPayload },
  res: express.Response,
  next: express.NextFunction,
) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: 'Falta el token del agente' });
  }
  try {
    req.agent = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as AgentPayload;
    next();
  } catch {
    return res.status(403).json({ message: 'Token de agente inválido' });
  }
}

function generateVerificationCode(): string {
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `VX-${rand}`;
}

function formatCLP(amount: number): string {
  return '$' + amount.toLocaleString('es-CL');
}

router.get('/document-types', (_req, res) => {
  res.json({ documentTypes: DOCUMENT_TYPES });
});

router.post(
  '/process-document',
  authenticateAgent,
  async (req: express.Request & { agent?: AgentPayload }, res) => {
    try {
      const body = req.body || {};
      const info = body.clientInfo || body.client || {};
      const clientName = String(info.name || info.nombre || '').trim();
      const clientRut = String(info.rut || '').trim();
      const clientPhone = String(info.phone || info.telefono || '').trim();
      const clientEmail = String(info.email || '').trim();
      const region = String(body.region || info.region || '').trim();
      const documentTypeKey = String(body.documentType || body.documentTypeId || '').trim();

      if (clientName.length < 3) {
        return res.status(400).json({ message: 'El nombre del cliente es inválido' });
      }
      if (!validateRut(clientRut)) {
        return res.status(400).json({ message: 'El RUT del cliente es inválido' });
      }
      if (!isRegionValida(region)) {
        return res.status(400).json({ message: 'Debe seleccionar una región válida' });
      }
      const docType = DOCUMENT_TYPES.find(
        (d) => d.id === documentTypeKey || d.name === documentTypeKey,
      );
      if (!docType) {
        return res.status(400).json({ message: 'Tipo de documento inválido' });
      }

      const agent = req.agent!;
      const amount = docType.price;
      const commission = Math.round(amount * COMMISSION_RATE);
      const verificationCode = generateVerificationCode();
      const createdAt = new Date();
      const verifyUrl = `${req.protocol}://${req.get('host')}/api/vecinos-pos/documents/verify/${verificationCode}`;

      // Generar PDF con QR de verificación.
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const red = rgb(0.86, 0.15, 0.15);
      const dark = rgb(0.1, 0.1, 0.12);
      const gray = rgb(0.4, 0.4, 0.45);

      page.drawRectangle({ x: 0, y: 792, width: 595, height: 50, color: red });
      page.drawText('VecinoXpress - Documento Notarial', {
        x: 40, y: 810, size: 16, font: bold, color: rgb(1, 1, 1),
      });

      let y = 740;
      const line = (label: string, value: string, size = 12) => {
        page.drawText(label, { x: 40, y, size: 10, font: bold, color: gray });
        page.drawText(value, { x: 40, y: y - 16, size, font, color: dark });
        y -= 40;
      };

      page.drawText(docType.name, { x: 40, y, size: 20, font: bold, color: dark });
      y -= 40;
      line('CLIENTE', clientName);
      line('RUT', formatRut(clientRut));
      line('PROVEEDOR REGIONAL', agent.username);
      line('REGIÓN', region);
      line('FECHA DE EMISIÓN', createdAt.toLocaleString('es-CL'));
      line('VALOR', formatCLP(amount));
      line('CÓDIGO DE VERIFICACIÓN', verificationCode, 14);

      page.drawText(
        'Este documento fue generado electrónicamente en un punto VecinoXpress',
        { x: 40, y: 120, size: 9, font, color: gray },
      );
      page.drawText(
        'conforme a la Ley 19.799 sobre firma electrónica.',
        { x: 40, y: 108, size: 9, font, color: gray },
      );

      // QR de verificación.
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, { margin: 1, width: 220 });
      const qrPng = await pdfDoc.embedPng(Buffer.from(qrDataUrl.split(',')[1], 'base64'));
      page.drawImage(qrPng, { x: 400, y: 60, width: 150, height: 150 });
      page.drawText('Escanea para verificar', { x: 410, y: 48, size: 8, font, color: gray });

      const pdfBytes = await pdfDoc.save();

      // Guardar archivo en uploads/pos para servirlo vía /uploads.
      const posDir = path.join(process.cwd(), 'uploads', 'pos');
      fs.mkdirSync(posDir, { recursive: true });
      const fileName = `${verificationCode}.pdf`;
      fs.writeFileSync(path.join(posDir, fileName), pdfBytes);
      const pdfPath = `/uploads/pos/${fileName}`;

      // Persistir el documento generado.
      const insert = await pool.query(
        `INSERT INTO pos_documents
          (partner_id, partner_username, region, document_type_id, document_type_name,
           client_name, client_rut, client_phone, client_email,
           verification_code, status, amount, commission, pdf_path, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
         RETURNING id`,
        [
          agent.id ?? null,
          agent.username,
          region,
          docType.id,
          docType.name,
          clientName,
          formatRut(clientRut),
          clientPhone || null,
          clientEmail || null,
          verificationCode,
          'generated',
          amount,
          commission,
          pdfPath,
          createdAt,
        ],
      );

      return res.json({
        success: true,
        documentId: insert.rows[0].id,
        documentType: docType.name,
        provider: agent.username,
        region,
        client: { name: clientName, rut: formatRut(clientRut), phone: clientPhone, email: clientEmail },
        verificationCode,
        pdfUrl: pdfPath,
        qrCode: qrDataUrl,
        amount,
        commission,
        commissionRate: COMMISSION_RATE,
        createdAt,
      });
    } catch (error) {
      console.error('Error generando documento POS:', error);
      return res.status(500).json({ message: 'Error al generar el documento' });
    }
  },
);

// Verificación pública por código.
router.get('/documents/verify/:code', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT document_type_name, client_name, client_rut, verification_code,
              status, amount, pdf_path, created_at, partner_username, region
         FROM pos_documents WHERE verification_code = $1`,
      [req.params.code],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ valid: false, message: 'Documento no encontrado' });
    }
    const doc = result.rows[0];
    return res.json({
      valid: true,
      documentType: doc.document_type_name,
      client: { name: doc.client_name, rut: doc.client_rut },
      verificationCode: doc.verification_code,
      status: doc.status,
      amount: doc.amount,
      pdfUrl: doc.pdf_path,
      provider: doc.partner_username,
      region: doc.region,
      createdAt: doc.created_at,
    });
  } catch (error) {
    console.error('Error verificando documento POS:', error);
    return res.status(500).json({ valid: false, message: 'Error al verificar el documento' });
  }
});

export default router;
