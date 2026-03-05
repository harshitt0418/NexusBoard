const nodemailer = require('nodemailer');

// Create Brevo SMTP transporter
const createTransporter = () => {
    return nodemailer.createTransport({
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_KEY,
        },
    });
};

/**
 * Send email using Brevo SMTP
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content (optional)
 * @param {String} options.html - HTML content (optional)
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
    try {
        if (!process.env.BREVO_SMTP_USER || !process.env.BREVO_SMTP_KEY) {
            console.error('❌ Email configuration missing: BREVO_SMTP_USER or BREVO_SMTP_KEY not set');
            throw new Error('Email service not configured');
        }

        const transporter = createTransporter();
        const fromEmail = process.env.EMAIL_FROM || process.env.BREVO_SMTP_USER;

        const mailOptions = {
            from: `"NexusBoard" <${fromEmail}>`,
            to,
            subject,
            text,
            html,
        };

        console.log(`📧 Sending email to ${to}...`);
        const info = await transporter.sendMail(mailOptions);
        console.log('✅ Email sent successfully:', info.messageId);
        return info;
    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        console.error('   Email config:', {
            user: process.env.BREVO_SMTP_USER ? 'SET' : 'NOT SET',
            key: process.env.BREVO_SMTP_KEY ? 'SET' : 'NOT SET',
        });
        throw new Error('Failed to send email. Please try again later.');
    }
};
