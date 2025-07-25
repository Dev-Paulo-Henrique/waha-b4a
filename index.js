const express = require("express");
const cors = require("cors");
const qrcode = require('qrcode-terminal');
const { Client, LocalAuth } = require('whatsapp-web.js');
const { promisify } = require("node:util");
const { exec } = require("node:child_process");

// --- FUNÇÃO PRINCIPAL ASSÍNCRONA PARA INICIAR O SERVIDOR ---
// Envolvemos tudo numa função async para podermos usar 'await' no início.
async function startServer() {
    console.log("A procurar o executável do Chromium no sistema...");
    let chromiumPath;

    try {
        // Lógica para encontrar o caminho do Chromium
        const { stdout } = await promisify(exec)("which chromium");
        chromiumPath = stdout.trim();
        if (!chromiumPath) {
            throw new Error("Comando 'which chromium' não retornou um caminho.");
        }
        console.log(`Chromium encontrado em: ${chromiumPath}`);
    } catch (error) {
        console.error("ERRO: Não foi possível encontrar o Chromium instalado no sistema.");
        console.error("Por favor, instale o Chromium (ex: 'sudo apt-get install chromium-browser') ou remova a opção 'executablePath' para usar a versão do Puppeteer.");
        process.exit(1); // Encerra a aplicação se não encontrar o browser
    }

    const app = express();
    app.use(cors());
    app.use(express.json());

    // Rota para o UptimeRobot manter o bot "acordado"
    app.get('/', (req, res) => {
        res.send('Olá! O bot de agendamento está ativo. 👋');
    });

    // --- CONFIGURAÇÃO DO WHATSAPP-WEB.JS ---

    console.log("Iniciando o cliente de WhatsApp...");
    const client = new Client({
        authStrategy: new LocalAuth(),
        puppeteer: {
            headless: 'new', // Usando o novo modo headless
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        }
    });

    let isClientReady = false;

    client.on('qr', qr => {
        console.log("QR Code recebido! Escaneie no terminal abaixo:");
        qrcode.generate(qr, { small: true });
    });

    client.on('ready', () => {
        isClientReady = true;
        console.log('Tudo certo! WhatsApp conectado e pronto para enviar mensagens.');
    });

    client.on('auth_failure', msg => {
        console.error('FALHA NA AUTENTICAÇÃO', msg);
    });

    client.initialize();

    // --- ROTAS DA API ---

    // Rota para ENVIAR MENSAGEM de agendamento
    app.post("/api/agendamento", async (req, res) => {
        const { numero, nome, servico, data, horario } = req.body;
        if (!numero || !nome || !servico || !data || !horario) {
            return res.status(400).json({ error: "Todos os parâmetros são obrigatórios." });
        }
        if (!isClientReady) {
            return res.status(503).json({ error: "O serviço de WhatsApp não está pronto." });
        }
        try {
            const chatId = `${numero.replace(/\D/g, '')}@c.us`;
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                return res.status(404).json({ error: "O número de destino não é um utilizador válido do WhatsApp." });
            }
            const mensagem = `Olá, ${nome}! ✨\n\nSeu horário para o serviço de *${servico}* está confirmado para o dia ${data} às ${horario}!\n\nMal posso esperar para te receber e cuidar de você com todo carinho.\n\nSe tiver qualquer dúvida, é só chamar por aqui, tá bom?\n\nUm beijo e até breve! 💋`;
            await client.sendMessage(chatId, mensagem);
            console.log(`Mensagem de agendamento enviada para ${numero}`);
            res.status(200).json({ success: `Mensagem de agendamento enviada para ${nome}.` });
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            res.status(500).json({ error: "Ocorreu um erro interno.", details: err.message });
        }
    });
    
    // Rota para ENVIAR MENSAGEM de agendamento
    app.post("/api/agendamento/admin", async (req, res) => {
        const { numero, nome, servico, data, horario } = req.body;
        if (!numero || !nome || !servico || !data || !horario) {
            return res.status(400).json({ error: "Todos os parâmetros são obrigatórios." });
        }
        if (!isClientReady) {
            return res.status(503).json({ error: "O serviço de WhatsApp não está pronto." });
        }
        try {
            const chatId = `${numero.replace(/\D/g, '')}@c.us`;
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                return res.status(404).json({ error: "O número de destino não é um utilizador válido do WhatsApp." });
            }
            const mensagem = `Olá, você recebeu uma solicitação de ${nome}! ✨\n\nO horário para o serviço de *${servico}* está agendado para o dia ${data} às ${horario}! 💋`;
            await client.sendMessage(chatId, mensagem);
            console.log(`Mensagem de agendamento enviada para ${numero}`);
            res.status(200).json({ success: `Mensagem de agendamento enviada para ${nome}.` });
        } catch (err) {
            console.error("Erro ao enviar mensagem:", err);
            res.status(500).json({ error: "Ocorreu um erro interno.", details: err.message });
        }
    });

    // Rota para ENVIAR MENSAGEM de cancelamento
    app.post("/api/cancelamento", async (req, res) => {
        const { numero, nome, servico, data, horario } = req.body;
        if (!numero || !nome || !servico || !data || !horario) {
            return res.status(400).json({ error: "Todos os parâmetros são obrigatórios." });
        }
        if (!isClientReady) {
            return res.status(503).json({ error: "O serviço de WhatsApp não está pronto." });
        }
        try {
            const chatId = `${numero.replace(/\D/g, '')}@c.us`;
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                return res.status(404).json({ error: "O número de destino não é um utilizador válido do WhatsApp." });
            }
            const mensagem = `Olá, ${nome}! Informamos que seu horário para *${servico}* em *${data}* às *${horario}* foi cancelado.\n\nPedimos desculpas por qualquer inconveniente! Gostaríamos muito de te receber em breve!\n\nQue dia seria bom para a gente remarcar? 😊`;
            await client.sendMessage(chatId, mensagem);
            console.log(`Mensagem de cancelamento enviada para ${numero}`);
            res.status(200).json({ success: `Mensagem de cancelamento enviada.` });
        } catch (err) {
            console.error("Erro ao enviar mensagem de cancelamento:", err);
            res.status(500).json({ error: "Ocorreu um erro interno.", details: err.message });
        }
    });

    // Rota para ENVIAR MENSAGEM de cancelamento
    app.post("/api/cancelamento/admin", async (req, res) => {
        const { numero, nome, servico, data, horario } = req.body;
        if (!numero || !nome || !servico || !data || !horario) {
            return res.status(400).json({ error: "Todos os parâmetros são obrigatórios." });
        }
        if (!isClientReady) {
            return res.status(503).json({ error: "O serviço de WhatsApp não está pronto." });
        }
        try {
            const chatId = `${numero.replace(/\D/g, '')}@c.us`;
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                return res.status(404).json({ error: "O número de destino não é um utilizador válido do WhatsApp." });
            }
            const mensagem = `Cancelamento de ${nome}! \n\nO horário para o serviço de *${servico}* está cancelado para o dia ${data} às ${horario}!`;
            await client.sendMessage(chatId, mensagem);
            console.log(`Mensagem de cancelamento enviada para ${numero}`);
            res.status(200).json({ success: `Mensagem de cancelamento enviada.` });
        } catch (err) {
            console.error("Erro ao enviar mensagem de cancelamento:", err);
            res.status(500).json({ error: "Ocorreu um erro interno.", details: err.message });
        }
    });

    // Inicia o servidor web
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`Servidor web a rodar na porta ${PORT}.`);

        // --- MUDANÇA: MECANISMO DE SELF-PING PARA NÃO CAIR ---
        // A cada 4 minutos, o servidor fará uma requisição a si mesmo.
        // Isto substitui a necessidade de um serviço externo como o UptimeRobot.
        const selfPingUrl = `http://localhost:${PORT}/`;
        setInterval(async () => {
            try {
                await fetch(selfPingUrl);
                console.log(`Self-ping realizado com sucesso em ${new Date().toLocaleTimeString()}. Bot continua ativo.`);
            } catch (pingError) {
                console.error(`Falha no self-ping: ${pingError.message}`);
            }
        }, 60000); // 240000 milissegundos = 4 minutos
    });
}

// Inicia todo o processo
startServer();
