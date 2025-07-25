const express = require("express");
const cors = require("cors");
const qrcode = require("qrcode-terminal");
const { toDataURL } = require("qrcode"); // para gerar QR em base64 para a web
const { Client, LocalAuth } = require("whatsapp-web.js");
const puppeteer = require("puppeteer");

async function startServer() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  let ultimoQrCode = null; // Aqui guardamos o QR Code atual

  // Rota simples para teste e uptime
  app.get("/", (req, res) => {
    res.send("Bot de WhatsApp está ativo ✅");
  });

  // Rota para mostrar o QR Code no navegador
  app.get("/qr", async (req, res) => {
    if (!ultimoQrCode) {
      return res.send("Nenhum QR Code disponível no momento.");
    }
    try {
      const qrImg = await toDataURL(ultimoQrCode);
      res.send(`
        <html>
          <body style="text-align:center; font-family:sans-serif;">
            <h2>Escaneie o QR Code para conectar o WhatsApp</h2>
            <img src="${qrImg}" />
          </body>
        </html>
      `);
    } catch (err) {
      res.status(500).send("Erro ao gerar QR Code.");
    }
  });

  // Inicializa o cliente do WhatsApp com Puppeteer embutido
  const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      executablePath: puppeteer.executablePath(),
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    },
  });

  let isClientReady = false;

  client.on("qr", (qr) => {
    ultimoQrCode = qr;
    console.log("QR Code recebido! Acesse /qr para escanear no navegador.");
    // Opcional: Também gera no terminal local (só funciona localmente)
    qrcode.generate(qr, { small: true });
  });

  client.on("ready", () => {
    isClientReady = true;
    console.log("WhatsApp conectado e pronto! ✅");
    ultimoQrCode = null; // Limpa QR ao conectar
  });

  client.on("auth_failure", (msg) => {
    console.error("Falha na autenticação:", msg);
  });

  client.initialize();

  // Exemplo de rota de envio de mensagem
  app.post("/api/agendamento", async (req, res) => {
    const { numero, nome, servico, data, horario } = req.body;

    if (!numero || !nome || !servico || !data || !horario) {
      return res.status(400).json({ error: "Todos os parâmetros são obrigatórios." });
    }
    if (!isClientReady) {
      return res.status(503).json({ error: "O WhatsApp ainda está iniciando." });
    }
    try {
      const chatId = `${numero.replace(/\D/g, "")}@c.us`;
      const isRegistered = await client.isRegisteredUser(chatId);

      if (!isRegistered) {
        return res.status(404).json({ error: "Número não é um usuário válido do WhatsApp." });
      }

      const mensagem = `Olá, ${nome}! ✨\nSeu horário para o serviço de *${servico}* está confirmado para o dia ${data} às ${horario}!\n\nQualquer dúvida, só chamar por aqui! 💋`;
      await client.sendMessage(chatId, mensagem);

      console.log(`Mensagem enviada para ${numero}`);
      res.status(200).json({ success: "Mensagem enviada com sucesso." });
    } catch (err) {
      console.error("Erro ao enviar mensagem:", err);
      res.status(500).json({ error: "Erro interno", details: err.message });
    }
  });

  // Start server
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);

    // Self-ping para evitar dormir em plataformas como Render
    const selfPingUrl = `http://localhost:${PORT}/`;
    setInterval(async () => {
      try {
        await fetch(selfPingUrl);
        console.log(`🔁 Self-ping feito em ${new Date().toLocaleTimeString()}`);
      } catch (pingError) {
        console.error(`Erro no self-ping: ${pingError.message}`);
      }
    }, 240000); // 4 minutos
  });
}

startServer();
