module.exports = {
    apps: [
        {
            name: 'ssl-alerts',
            script: 'index.js',
            autorestart: true,
            time: true,
        },
    ],
};
