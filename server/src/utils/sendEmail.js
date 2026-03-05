const Brevo = require('@getbrevo/brevo');

// Initialize Brevo transactional email API client
const apiInstance = new Brevo.TransactionalEmailsApi();

/**
 * Send email using Brevo HTTP API (faster and more reliable than SMTP in production)
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content (optional)
 * @param {String} options.html - HTML content (optional)
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
    try {
        if (!process.env.BREVO_API_KEY) {
            console.error('❌ Email configuration missing: BREVO_API_KEY not set');
            throw new Error('Email service not configured');
        }

        // Set API key on each call (safe for stateless/serverless environments)
        apiInstance.setApiKey(
            Brevo.TransactionalEmailsApiApiKeys.apiKey,
            process.env.BREVO_API_KEY
        );

        const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM;

        const sendSmtpEmail = new Brevo.SendSmtpEmail();
        sendSmtpEmail.subject = subject;
        sendSmtpEmail.htmlContent = html || `<p>${text}</p>`;
        sendSmtpEmail.sender = { name: 'NexusBoard', email: senderEmail };
        sendSmtpEmail.to = [{ email: to }];

        console.log(`📧 Sending email to ${to} via Brevo API...`);
        const response = await apiInstance.sendTransacEmail(sendSmtpEmail);
        console.log('✅ Email sent successfully, messageId:', response.body?.messageId);
        return response;
    } catch (error) {
        console.error('❌ Brevo email send failed:', error.message);
        console.error('   Email config:', {
            apiKey: process.env.BREVO_API_KEY ? 'SET' : 'NOT SET',
            senderEmail: process.env.BREVO_SENDER_EMAIL || process.env.EMAIL_FROM || 'NOT SET',
        });
        throw new Error('Failed to send email. Please try again later.');
    }
};

