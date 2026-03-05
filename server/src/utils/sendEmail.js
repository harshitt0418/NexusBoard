const nodemailer = require('nodemailer');

// Create reusable transporter
const createTransporter = () => {
    if (process.env.EMAIL_SERVICE === 'gmail') {
        return nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465, // Use SSL port instead of 587
            secure: true, // true for port 465
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_APP_PASSWORD, // Use App Password, not regular password
            },
            connectionTimeout: 10000, // 10s to establish SMTP connection
            greetingTimeout: 10000,   // 10s for SMTP greeting
            socketTimeout: 15000,     // 15s for socket inactivity
        });
    }

    // Generic SMTP configuration
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || 465,
        secure: process.env.SMTP_SECURE !== 'false', // true for 465, false for other ports
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_APP_PASSWORD,
        },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    });
};

/**
 * Send email
 * @param {Object} options - Email options
 * @param {String} options.to - Recipient email
 * @param {String} options.subject - Email subject
 * @param {String} options.text - Plain text content (optional)
 * @param {String} options.html - HTML content (optional)
 */
exports.sendEmail = async ({ to, subject, text, html }) => {
    try {
        // Validate email configuration
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.error('❌ Email configuration missing: EMAIL_USER or EMAIL_APP_PASSWORD not set');
            throw new Error('Email service not configured');
        }

        const transporter = createTransporter();

        const mailOptions = {
            from: `"NexusBoard" <${process.env.EMAIL_USER}>`,
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
            service: process.env.EMAIL_SERVICE || 'smtp',
            user: process.env.EMAIL_USER ? 'SET' : 'NOT SET',
            password: process.env.EMAIL_APP_PASSWORD ? 'SET' : 'NOT SET'
        });
        throw new Error('Failed to send email. Please try again later.');
    }
};
