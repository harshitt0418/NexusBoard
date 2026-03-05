const { Resend } = require('resend');

/**
 * Send email using Resend API
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content (optional)
 * @param {String} options.html - HTML content (optional)
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
    try {
        // Validate email configuration
        if (!process.env.RESEND_API_KEY) {
            console.error('❌ Email configuration missing: RESEND_API_KEY not set');
            throw new Error('Email service not configured');
        }

        // Initialize Resend client
        const resend = new Resend(process.env.RESEND_API_KEY);

        // Set from email (use environment variable or default)
        const fromEmail = process.env.EMAIL_FROM || 'no-reply@nexusboard.app';

        console.log(`📧 Sending email to ${to}...`);
        
        const { data, error } = await resend.emails.send({
            from: `NexusBoard <${fromEmail}>`,
            to: to,
            subject: subject,
            html: html || text, // Prefer HTML, fallback to text
        });

        if (error) {
            console.error('❌ Resend API error:', error);
            throw new Error(error.message || 'Failed to send email via Resend');
        }

        console.log('✅ Email sent successfully:', data.id);
        return data;
    } catch (error) {
        console.error('❌ Email send failed:', error.message);
        console.error('   Email config:', { 
            resendApiKey: process.env.RESEND_API_KEY ? 'SET' : 'NOT SET',
            emailFrom: process.env.EMAIL_FROM || 'no-reply@nexusboard.app',
        });
        throw new Error('Failed to send email. Please try again later.');
    }
};
