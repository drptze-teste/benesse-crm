import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import crypto from "crypto";
import admin from 'firebase-admin';
import { GoogleGenAI } from "@google/genai";

// Modelo Gemini configurável por env; default estável e disponível.
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

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

// Exige um ID token Firebase válido (Authorization: Bearer <token>). Protege as
// rotas de IA — só usuários logados podem gastar a cota do Gemini.
async function isAuthed(req: any): Promise<boolean> {
  const h = req.headers["authorization"] || "";
  const m = /^Bearer (.+)$/.exec(Array.isArray(h) ? h[0] : h);
  if (!m) return false;
  try {
    await admin.auth().verifyIdToken(m[1]);
    return true;
  } catch {
    return false;
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Captura o corpo bruto (necessário para validar a assinatura HMAC da Meta).
  app.use(express.json({
    limit: "256kb",
    verify: (req: any, _res, buf) => { req.rawBody = buf; },
  }));

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // IA: extrai dados de lead a partir de uma mensagem de WhatsApp.
  // A chave do Gemini fica SOMENTE no servidor (nunca no bundle do browser).
  app.post("/api/ai/whatsapp-lead", async (req, res) => {
    if (!(await isAuthed(req))) {
      return res.status(401).json({ error: "Não autenticado." });
    }
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
      let data: any;
      try {
        data = JSON.parse(raw);
      } catch {
        return res.status(502).json({ error: "A IA retornou um formato inesperado. Tente novamente." });
      }
      if (data && typeof data === "object") {
        data.estimatedValue = Number(data.estimatedValue) || 0;
        if (!["Low", "Medium", "High"].includes(data.priority)) data.priority = "Medium";
        if (!["Cold", "Warm", "Hot"].includes(data.temperature)) data.temperature = "Warm";
      }
      return res.json(data);
    } catch (err) {
      console.error("Erro IA whatsapp-lead:", err);
      return res.status(500).json({ error: "Falha ao processar com IA." });
    }
  });

  // IA: redige o ESCOPO ou o E-MAIL de apresentação de uma proposta.
  // Nunca inclui preços/custos/margens (regra do modelo de proposta).
  app.post("/api/ai/proposal-text", async (req, res) => {
    if (!(await isAuthed(req))) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }
    const { tipo, contratante, itens, categoria } = req.body || {};
    if (!contratante && !(Array.isArray(itens) && itens.length)) {
      return res.status(400).json({ error: "Dados insuficientes para gerar o texto." });
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      const lista = Array.isArray(itens) ? itens.filter(Boolean).join(", ") : "";
      const promptEscopo = `Você redige propostas comerciais da Benesse Gestão Esportiva (assessoria de saúde, bem-estar e atividade física para empresas e condomínios).
Escreva o ESCOPO do serviço para o contratante "${contratante || ''}"${categoria ? ` (categoria: ${categoria})` : ''}.
Serviços/modalidades: ${lista || 'atividades de bem-estar'}.
Tom profissional e claro, 1 a 2 parágrafos, foco na saúde e no bem-estar dos participantes.
NÃO mencione preços, custos, encargos, salários ou margens. Responda APENAS com o texto do escopo, sem título.`;
      const promptEmail = `Escreva um e-mail curto e cordial de APRESENTAÇÃO da proposta da Benesse Gestão Esportiva para "${contratante || ''}".
Serviços: ${lista || 'atividades de bem-estar'}. Tom profissional e caloroso, 1 parágrafo, convidando a conversar.
NÃO inclua preços. Responda APENAS com o corpo do e-mail (sem assunto e sem assinatura).`;
      const prompt = tipo === 'email' ? promptEmail : promptEscopo;
      const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
      return res.json({ texto: (response.text || "").trim() });
    } catch (err) {
      console.error("Erro IA proposal-text:", err);
      return res.status(500).json({ error: "Falha ao gerar texto com IA." });
    }
  });

  // IA: redige uma mensagem de abordagem para "possível recompra" (sazonalidade).
  app.post("/api/ai/recompra-text", async (req, res) => {
    if (!(await isAuthed(req))) {
      return res.status(401).json({ error: "Não autenticado." });
    }
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: "GEMINI_API_KEY não configurada no servidor." });
    }
    const { customerName, item, quando, basis } = req.body || {};
    if (!customerName && !item) {
      return res.status(400).json({ error: "Dados insuficientes para gerar a mensagem." });
    }
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é vendedor da Benesse Gestão Esportiva. Escreva uma mensagem curta e cordial de WhatsApp para o cliente "${customerName || ''}", retomando o contato porque ele costuma contratar "${item || 'nossos serviços'}" nesta época do ano (${quando || ''}; histórico: ${basis || ''}).
Tom amigável e consultivo, 2 a 4 linhas, oferecendo renovar ou agendar uma conversa. NÃO invente preços. Responda APENAS com a mensagem.`;
      const response = await ai.models.generateContent({ model: GEMINI_MODEL, contents: prompt });
      return res.json({ texto: (response.text || "").trim() });
    } catch (err) {
      console.error("Erro IA recompra-text:", err);
      return res.status(500).json({ error: "Falha ao gerar mensagem com IA." });
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

  // Política de Privacidade (exigida pela Meta para publicar o app).
  app.get("/privacidade", (_req, res) => {
    res.type("html").send(`<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Política de Privacidade — Benesse Gestão Esportiva</title>
  <style>
    body { font-family: -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 760px; margin: 0 auto; padding: 32px 20px 64px; }
    h1 { color: #003366; font-size: 1.7rem; }
    h2 { color: #003366; font-size: 1.15rem; margin-top: 28px; }
    a { color: #0055A4; }
    .muted { color: #6c757d; font-size: .9rem; }
  </style>
</head>
<body>
  <h1>Política de Privacidade</h1>
  <p class="muted">Benesse Gestão Esportiva · Última atualização: junho de 2026</p>

  <p>Esta política descreve como a <strong>Benesse Gestão Esportiva</strong> ("Benesse", "nós")
  coleta e utiliza dados de clientes e potenciais clientes em seu sistema de gestão de
  relacionamento (CRM).</p>

  <h2>1. Dados que coletamos</h2>
  <ul>
    <li>Dados de contato que você nos fornece: nome, telefone, e-mail e empresa.</li>
    <li>Mensagens que você nos envia pelo nosso WhatsApp comercial.</li>
    <li>Histórico de interações, propostas e negociações do seu atendimento.</li>
  </ul>

  <h2>2. Como usamos os dados</h2>
  <ul>
    <li>Responder às suas solicitações e dúvidas.</li>
    <li>Elaborar e enviar propostas comerciais.</li>
    <li>Gerenciar o relacionamento comercial e aprimorar nosso atendimento.</li>
  </ul>

  <h2>3. WhatsApp</h2>
  <p>As mensagens enviadas ao nosso WhatsApp comercial são recebidas e armazenadas em nosso
  sistema para que possamos atendê-lo. Utilizamos a API oficial do WhatsApp Business (Meta).</p>

  <h2>4. Compartilhamento</h2>
  <p>Não vendemos seus dados. Utilizamos provedores de tecnologia (como Google Firebase e Meta)
  estritamente para operar o sistema.</p>

  <h2>5. Seus direitos (LGPD)</h2>
  <p>Conforme a Lei Geral de Proteção de Dados, você pode solicitar acesso, correção ou exclusão
  dos seus dados a qualquer momento pelo contato abaixo.</p>

  <h2>6. Retenção</h2>
  <p>Mantemos os dados pelo tempo necessário ao relacionamento comercial e ao cumprimento de
  obrigações legais.</p>

  <h2>7. Contato</h2>
  <p>Dúvidas ou solicitações sobre seus dados: <a href="mailto:zeluiz@benessegestaoesportiva.com.br">zeluiz@benessegestaoesportiva.com.br</a>.</p>
</body>
</html>`);
  });

  // Serve uma proposta gerada (documento type 'Proposal') por link público.
  // O id é gerado pelo Firestore (não-adivinhável) — link "qualquer um com o link".
  app.get("/proposta/:id", async (req, res) => {
    try {
      const snap = await db.collection("documents").doc(req.params.id).get();
      const data = snap.data();
      if (!snap.exists || !data || !["Proposal", "Schedule"].includes(data.type) || !data.content) {
        return res.status(404).type("html").send("<h1>Documento não encontrado</h1>");
      }
      return res.type("html").send(String(data.content));
    } catch (err) {
      console.error("Erro ao servir proposta:", err);
      return res.status(500).type("html").send("<h1>Erro ao carregar a proposta</h1>");
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
