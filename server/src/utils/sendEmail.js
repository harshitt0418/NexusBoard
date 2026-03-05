const https = require('https');

/**
 * Send email via Brevo REST API (no SDK — uses Node built-in https)
 * @param {Object} options
 * @param {String} options.to       - Recipient email
 * @param {String} options.subject  - Email subject
 * @param {String} options.text     - Plain text (optional)
 * @param {String} options.html     - HTML content (optional)
 */
exports.sendEmail = ({ to, subject, text, html }) => {
    return new Promise((resolve, reject) => {
        if (!process.env.BREVO_API_KEY || !process.env.BREVO_SENDER_EMAIL) {
            console.error('❌ Email config missing: BREVO_API_KEY or BREVO_SENDER_EMAIL not set');
            return reject(new Error('Email service not configured'));
        }

        const payload = JSON.stringify({
            sender: { name: 'NexusBoard', email: process.env.BREVO_SENDER_EMAIL },
            to: [{ email: to }],
            subject,
            htmlContent: html || `<p>${text}</p>`,
        });

        const options = {
            hostname: 'api.brevo.com',
            path: '/v3/smtp/email',
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'api-key': process.env.BREVO_API_KEY,
                'content-type': 'application/json',
                'content-length': Buffer.byteLength(payload),
            },
        };

        console.log(`📧 Sending email to ${to} via Brevo API...`);

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => { data += chunk; });
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    console.log('✅ Email sent successfully, status:', res.statusCode);
                    resolve(JSON.parse(data));
                } else {
                    console.error('❌ Brevo API error:', res.statusCode, data);
                    reject(new Error(`Brevo API error ${res.statusCode}: ${data}`));
                }
            });
        });

        req.on('error', (err) => {
            console.error('❌ Brevo request error:', err.message);
            reject(new Error('Failed to send email. Please try again later.'));
        });

        req.write(payload);
        req.end();
    });
};


