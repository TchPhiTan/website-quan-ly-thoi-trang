const Mailjet = require('node-mailjet');

const mailjet = new Mailjet({
    apiKey: process.env.MAILJET_API_KEY || 'your-api-key',
    apiSecret: process.env.MAILJET_API_SECRET || 'your-api-secret',
});

module.exports = mailjet;
