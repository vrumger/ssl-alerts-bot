const { Bot } = require('grammy');
const { readFile, writeFile } = require('fs/promises');
const ms = require('./ms');
const tls = require('tls');

require('dotenv').config();

const bot = new Bot(process.env.BOT_TOKEN);

const getData = async () => {
    try {
        const data = await readFile('data.json', 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { expiringDomains: [] };
    }
};

const saveData = async data => {
    await writeFile('data.json', JSON.stringify(data));
};

const processDomain = (domain, chatId) => {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(
            {
                port: 443,
                host: domain,
                servername: domain,
                rejectUnauthorized: false,
            },
            async () => {
                socket.end();

                const cert = socket.getPeerX509Certificate();
                const expiration = new Date(cert.validTo);

                if (expiration - Date.now() < ms.days(30).ms) {
                    const days = Math.floor((expiration - Date.now()) / 864e5);

                    await bot.api.sendMessage(
                        chatId,
                        days < 0
                            ? `❌ the ssl cert for ${domain} has expired`
                            : `⌛️ the ssl cert for ${domain} will expire in ${days} days`,
                    );

                    const data = await getData();
                    if (!data.expiringDomains.includes(domain)) {
                        data.expiringDomains.push(domain);
                        await saveData(data);
                    }
                } else {
                    const data = await getData();
                    if (data.expiringDomains.includes(domain)) {
                        await bot.api.sendMessage(
                            chatId,
                            `✅ the ssl cert for ${domain} has been renewed`,
                        );

                        data.expiringDomains = data.expiringDomains.filter(
                            d => d !== domain,
                        );
                        await saveData(data);
                    }
                }

                resolve();
            },
        );

        socket.setTimeout(ms.seconds(30).ms, () => {
            socket.destroy(new Error('Connection timed out'));
        });

        socket.on('error', reject);
    });
};

const processDomains = async () => {
    const domains = await readFile('domains.txt', 'utf-8');

    domains.split('\n').forEach(async line => {
        const [domain, chatId] = line.split(' ');

        if (domain && chatId) {
            console.log(`Processing ${domain}`, chatId);

            try {
                await processDomain(domain, chatId);
            } catch (error) {
                console.error(`Failed to process ${domain}:`, error);
            }
        }
    });
};

processDomains();
setInterval(processDomains, ms.days(3.5).ms);
