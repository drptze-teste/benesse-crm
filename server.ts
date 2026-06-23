import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import admin from 'firebase-admin';
import { GoogleGenAI } from "@google/genai";

// Modelo Gemini configurável por env; default estável e disponível.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

// Segredo do App da Meta (App Secret). Se configurado, valida a assinatura
// X-Hub-Signature-256 de cada webhook — impede que terceiros forjem mensagens.
// Enquanto não estiver setado, a validação é pulada (modo de testes).
const WHATSAPP_APP_SECRET = process.env.WHATSAPP_APP_SECRET || "";

function isValidMetaSignature(req: any): boolean {
  if (!WHATSAPP_APP_SECRET) return true; // sem segredo configurado → não valida (testes)
  const signature = req.headers["x-hub-signature-256"];
  if (!signature || !req.rawBody) return false;
  const expected = "sha256=" + crypto
    .createHmac("sha256", WHATSAPP_APP_SECRET)
    .update(req.rawBody)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

// Load config safely
const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

// Handle __dirname and __filename for both ESM and CJS
const _filename = typeof __filename !== 'undefined' ? __filename : fileURLToPath(import.meta.url);
const _dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(_filename);

// Initialize Firebase Admin for the server
// This uses default credentials in the Cloud environment
admin.initializeApp({
  projectId: firebaseConfig.projectId,
});

const db = admin.firestore();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Captura o corpo bruto (necessário para validar a assinatura HMAC da Meta).
  app.use(express.json({
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // IA: extrai dados de lead a partir de uma mensagem de WhatsApp.
  // A chave do Gemini fica SOMENTE no servidor (nunca no bundle do browser).
  app.post("/api/ai/whatsapp-lead", async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }
    const { text, name, from, businessUnit } = req.body || {};
    if (!text && !name) {
      return res.status(400).json({ error: "Mensagem vazia." });
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Analise a seguinte mensagem de WhatsApp recebida por uma empresa de Gestão Esportiva e Studio de Pilates.
      Extraia as informações para criar um lead no CRM.

      Mensagem: "${text || ''}"
      Nome do Remetente: ${name || ''}
      Telefone: ${from || ''}
      Unidade de Negócio Sugerida: ${businessUnit || 'Gestão Esportiva'}

      Responda APENAS com um JSON no seguinte formato:
      {
        "name": "Nome extraído ou o fornecido",
        "companyName": "Nome da empresa se houver",
        "businessUnit": "Gestão Esportiva" ou "Studio de Pilates",
        "estimatedValue": número,
        "leadSource": "WhatsApp",
        "priority": "Low" | "Medium" | "High",
        "temperature": "Cold" | "Warm" | "Hot",
        "summary": "Resumo da necessidade do cliente"
      }`;

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json" },
      });
      const raw = (response.text || "{}").replace(/```json|```/g, "").trim();
      const data = JSON.parse(raw);
      return res.json(data);
    } catch (err) {
      console.error("Erro IA whatsapp-lead:", err);
      return res.status(500).json({ error: "Falha ao processar com IA." });
    }
  });

  // WhatsApp Webhook Verification
  app.get("/api/webhook/whatsapp", (req, res) => {
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || "benesse_crm_token";

    if (mode && token) {
      if (mode === "subscribe" && token === verifyToken) {
        console.log("WEBHOOK_VERIFIED");
        res.status(200).send(challenge);
      } else {
        res.sendStatus(403);
      }
    }
  });

  // WhatsApp Webhook Reception
  app.post("/api/webhook/whatsapp", async (req, res) => {
    // Segurança: rejeita payloads sem assinatura válida da Meta (quando o App Secret está configurado).
    if (!isValidMetaSignature(req)) {
      console.warn("Webhook WhatsApp: assinatura inválida — rejeitado.");
      return res.sendStatus(403);
    }

    const body = req.body;

    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        const message = body.entry[0].changes[0].value.messages[0];
        const contact = body.entry[0].changes[0].value.contacts[0];
        const metadata = body.entry[0].changes[0].value.metadata;
        
        try {
          await db.collection('whatsapp_inbox').add({
            from: message.from,
            businessPhoneNumber: metadata.display_phone_number || metadata.phone_number_id || "unknown",
            name: contact.profile.name || "Desconhecido",
            text: message.text?.body || "",
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            status: 'new',
            raw: body
          });
          console.log("WhatsApp message saved to Firestore via Admin SDK");
        } catch (err) {
          console.error("Error saving WhatsApp message:", err);
        }
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
