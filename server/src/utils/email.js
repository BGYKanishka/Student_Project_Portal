const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  // Use user's SMTP settings if provided, otherwise fallback to Ethereal for testing
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Sends an email
 * @param {string} to - Recipient email address
 * @param {string} subject - Email subject
 * @param {string} html - Email body in HTML format
 */
const sendEmail = async (to, subject, html) => {
  try {
    // If SMTP_USER isn't provided, create a test account on the fly for development
    if (!process.env.SMTP_USER && process.env.NODE_ENV !== 'production') {
      console.log('No SMTP_USER configured. Creating Ethereal test account...');
      const testAccount = await nodemailer.createTestAccount();
      
      transporter.options.auth = {
        user: testAccount.user,
        pass: testAccount.pass,
      };
    }

    const info = await transporter.sendMail({
      from: `"UOK Connect" <${transporter.options.auth.user || 'noreply@uok-connect.com'}>`,
      to,
      subject,
      html,
    });

    console.log('Message sent: %s', info.messageId);
    
    if (!process.env.SMTP_USER) {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return true;
  } catch (error) {
    console.error('Error sending email: ', error);
    return false;
  }
};

module.exports = {
  sendEmail,
};
