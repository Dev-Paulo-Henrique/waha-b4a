const express = require("express");
const cors = require("cors");
const qrcode = require("qrcode-terminal");
const { Client, LocalAuth } = require("whatsapp-web.js");
const puppeteer = require("puppeteer"); // ✅ IMPORTANTE!

async function startServer() {
    const app = express();
    app.use(cors());
    app.use(express.json());

    // Rota de teste
    app.get("/", (req, res) => {
        res.send("Bot de WhatsApp está ativo ✅");
    });

    // --- INICIALIZA O CLIENT DO WHATSAPP ---
    console.log("Inicializando o cliente do WhatsApp com Chromium embutido...");

    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            executablePath: puppeteer.executablePath(), // ✅ USA O CHROMIUM DO PUPPETEER
            headless: "new",
            args: ["--no-sandbox", "--disable-setuid-sandbox"]
        }
    });

    let isClientReady = false;

    client.on("qr", (qr) => {
        console.log("QR Code recebido! Escaneie:");
        qrcode.generate(qr, { small: true });
    });

    client.on("ready", () => {
        isClientReady = true;
        console.log("WhatsApp conectado e pronto! ✅");
    });

    client.on("auth_failure", (msg) => {
        console.error("FALHA DE AUTENTICAÇÃO:", msg);
    });

    client.initialize();

    // --- ROTAS ---

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
                return res.status(404).json({ error: "O número não é um usuário válido do WhatsApp." });
            }

            const mensagem = `Olá, ${nome}! ✨\n\nSeu horário para o serviço de *${servico}* está confirmado para o dia ${data} às ${horario}!\n\nSe tiver qualquer dúvida, é só chamar por aqui! 💋`;
            await client.sendMessage(chatId, mensagem);

            console.log(`✅ Mensagem enviada para ${numero}`);
            res.status(200).json({ success: "Mensagem enviada com sucesso." });
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            res.status(500).json({ error: "Erro interno", details: err.message });
        }
    });

    // Outras rotas como /api/agendamento/admin, /api/cancelamento, etc.
    // Você pode copiar o mesmo padrão acima para manter o comportamento

    // --- SERVIDOR E SELF-PING ---
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);

        const selfPingUrl = `http://localhost:${PORT}/`;
        setInterval(async () => {
            try {
                await fetch(selfPingUrl);
                console.log(`🔁 Self-ping: Bot ainda ativo às ${new Date().toLocaleTimeString()}`);
            } catch (pingError) {
                console.error(`Erro no self-ping: ${pingError.message}`);
            }
        }, 240000); // a cada 4 minutos
    });
}

startServer();
