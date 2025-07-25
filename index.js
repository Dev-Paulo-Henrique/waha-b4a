const { exec } = require('child_process');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcodeTerminal = require('qrcode-terminal');
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch'); // Se necessário instalar com npm i node-fetch

// Função para rodar comandos pm2 via código (opcional)
async function runPm2Commands() {
  console.log("Executando comandos PM2 via script...");
  
  exec('npm install -g pm2', (error, stdout, stderr) => {
    if (error) {
      console.error(`Erro ao instalar pm2: ${error.message}`);
      return;
    }
    console.log(`Output install pm2: ${stdout}`);

    exec('pm2 link pn3ak0162lqhir5 i8peimid2a4wgud', (err2, stdout2, stderr2) => {
      if (err2) {
        console.error(`Erro no pm2 link: ${err2.message}`);
        return;
      }
      console.log(`Output pm2 link: ${stdout2}`);

      exec('pm2 start index.js --name waha-bot', (err3, stdout3, stderr3) => {
        if (err3) {
          console.error(`Erro no pm2 start: ${err3.message}`);
          return;
        }
        console.log(`Output pm2 start: ${stdout3}`);
      });
    });
  });
}

// Descomente se quiser rodar os comandos PM2 pelo código (não recomendado em produção)
// runPm2Commands();

const app = express();
app.use(cors());
app.use(express.json());

const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: {
    headless: 'new', // modo mais atual do puppeteer
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  }
});

let isClientReady = false;

client.on('qr', qr => {
  console.log('QR code recebido, escaneie no WhatsApp:');
  qrcodeTerminal.generate(qr, { small: true });
});

client.on('ready', () => {
  isClientReady = true;
  console.log('WhatsApp conectado e pronto!');
});

client.on('auth_failure', msg => {
  console.error('Falha na autenticação:', msg);
});

client.initialize();

app.get('/', (req, res) => {
  res.send('Bot ativo! 👋');
});

// ROTAS

// Enviar mensagem de agendamento
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

// Enviar mensagem de agendamento para admin
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

// Enviar mensagem de cancelamento
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

// Enviar mensagem de cancelamento para admin
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

// Self-ping para manter app acordado a cada 4 minutos (opcional)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);

  const selfPingUrl = `http://localhost:${PORT}/`;
  setInterval(async () => {
    try {
      await fetch(selfPingUrl);
      console.log(`Self-ping realizado em ${selfPingUrl}`);
    } catch (error) {
      console.error('Erro no self-ping:', error.message);
    }
  }, 60 * 1000);
});
