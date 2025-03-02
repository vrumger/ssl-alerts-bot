const { Bot } = require('grammy');
const { readFile } = require('fs/promises');
const ms = require('./ms');
const tls = require('tls');

require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

const processDomain = (domain, chatId) => {
    return new Promise(resolve => {
        const socket = tls.connect(
            { port: 443, host: domain, servername: domain },
            async () => {
                socket.end();

                const cert = socket.getPeerX509Certificate();
                const expiration = new Date(cert.validTo);

                if (expiration - Date.now() < ms.days(40).ms) {
                    await bot.api.sendMessage(
                        chatId,
                        `⌛️ the ssl cert for ${domain} will expire in ${Math.floor(
                            (expiration - Date.now()) / 864e5,
                        )} days`,
                    );
                }

                resolve();
            },
        );
    });
};

const processDomains = async () => {
    const domains = await readFile('domains.txt', 'utf-8');

    domains.split('\n').forEach(async line => {
        const [domain, chatId] = line.split(' ');

        if (domain && chatId) {
            console.log(`Processing ${domain}`, chatId);
            await processDomain(domain, chatId);
        }
    });
};

processDomains();
setInterval(processDomains, ms.days(3.5).ms);
