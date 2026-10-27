const { Bot } = require('grammy');
const { readFile, writeFile } = require('fs/promises');
const ms = require('./ms');
const path = require('path');
const tls = require('tls');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const DATA_FILE = path.join(__dirname, 'data.json');
const DOMAINS_FILE = path.join(__dirname, 'domains.txt');

const bot = new Bot(process.env.BOT_TOKEN);

const getData = async () => {
    try {
        const data = await readFile(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return { expiringDomains: [] };
    }
};

const saveData = async data => {
    await writeFile(DATA_FILE, JSON.stringify(data));
};

const getCertificate = domain => {
    return new Promise((resolve, reject) => {
        const socket = tls.connect(
            {
                port: 443,
                host: domain,
                servername: domain,
                rejectUnauthorized: false,
            },
            () => {
                const cert = socket.getPeerX509Certificate();
                socket.end();

                if (cert) {
                    resolve(cert);
                } else {
                    reject(new Error('No certificate was presented'));
                }
            },
        );

        socket.setTimeout(ms.seconds(30).ms, () => {
            socket.destroy(new Error('Connection timed out'));
        });

        socket.on('error', reject);
    });
};

const processDomain = async (domain, chatId) => {
    const cert = await getCertificate(domain);
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
};

const processDomains = async () => {
    const domains = await readFile(DOMAINS_FILE, 'utf-8');

    for (const line of domains.split('\n')) {
        const [domain, chatId] = line.trim().split(/\s+/);

        if (domain && chatId) {
            console.log(`Processing ${domain}`, chatId);

            try {
                await processDomain(domain, chatId);
            } catch (error) {
                console.error(`Failed to process ${domain}:`, error);
            }
        }
    }
};

const run = () =>
    processDomains().catch(error => {
        console.error('Failed to process domains:', error);
    });

run();
setInterval(run, ms.days(3.5).ms);
