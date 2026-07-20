const nodemailer = require('nodemailer');

/**
 * Create a reusable transporter.
 * Falls back to Ethereal (fake SMTP) if real credentials aren't configured.
 */
const createTransporter = async () => {
  // If real credentials are configured, use them
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS && process.env.EMAIL_USER !== 'your_email@gmail.com') {
    return nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }

  // Fallback: use Ethereal test account (emails can be viewed at ethereal.email)
  const testAccount = await nodemailer.createTestAccount();
  console.log('📧 Using Ethereal test email account');
  console.log(`   View sent emails at: https://ethereal.email/login`);
  console.log(`   User: ${testAccount.user}`);
  console.log(`   Pass: ${testAccount.pass}`);

  return nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });
};

let transporter = null;

const getTransporter = async () => {
  if (!transporter) {
    transporter = await createTransporter();
  }
  return transporter;
};

/**
 * Send welcome email to newly registered user.
 */
const sendWelcomeEmail = async (userEmail, userName) => {
  try {
    const transport = await getTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"CareerLens AI" <noreply@careerlensai.com>',
      to: userEmail,
      subject: '🎉 Welcome to CareerLens AI!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0a0a0f; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <!-- Header -->
            <div style="text-align: center; padding: 40px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 16px 16px 0 0;">
              <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">
                🔍 CareerLens AI
              </h1>
              <p style="color: rgba(255,255,255,0.85); margin: 10px 0 0; font-size: 14px;">
                AI-Powered Career Intelligence Platform
              </p>
            </div>
            
            <!-- Body -->
            <div style="background-color: #13131a; padding: 40px 30px; border: 1px solid rgba(255,255,255,0.06);">
              <h2 style="color: #ffffff; margin: 0 0 20px; font-size: 22px;">
                Welcome aboard, ${userName}! 🚀
              </h2>
              <p style="color: #a0a0b8; line-height: 1.7; margin: 0 0 25px; font-size: 15px;">
                Welcome to CareerLens AI! We're excited to help you grow your career. Our AI-powered platform provides comprehensive tools to supercharge your career journey.
              </p>
              
              <!-- Features -->
              <div style="margin: 25px 0;">
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; margin-right: 15px; flex-shrink: 0;">📄</span>
                  <div>
                    <strong style="color: #e0e0f0; font-size: 14px;">Resume Analysis</strong>
                    <p style="color: #a0a0b8; margin: 3px 0 0; font-size: 13px;">AI-powered resume parsing and insights</p>
                  </div>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="background: linear-gradient(135deg, #f093fb, #f5576c); color: white; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; margin-right: 15px; flex-shrink: 0;">🎯</span>
                  <div>
                    <strong style="color: #e0e0f0; font-size: 14px;">ATS Optimization</strong>
                    <p style="color: #a0a0b8; margin: 3px 0 0; font-size: 13px;">Beat applicant tracking systems</p>
                  </div>
                </div>
                <div style="display: flex; align-items: center; margin-bottom: 15px;">
                  <span style="background: linear-gradient(135deg, #4facfe, #00f2fe); color: white; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; margin-right: 15px; flex-shrink: 0;">🎤</span>
                  <div>
                    <strong style="color: #e0e0f0; font-size: 14px;">AI Mock Interviews</strong>
                    <p style="color: #a0a0b8; margin: 3px 0 0; font-size: 13px;">Practice with intelligent AI interviewer</p>
                  </div>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="background: linear-gradient(135deg, #43e97b, #38f9d7); color: white; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; font-size: 16px; margin-right: 15px; flex-shrink: 0;">📊</span>
                  <div>
                    <strong style="color: #e0e0f0; font-size: 14px;">Career Feedback</strong>
                    <p style="color: #a0a0b8; margin: 3px 0 0; font-size: 13px;">Personalized career roadmap</p>
                  </div>
                </div>
              </div>
              
              <!-- CTA -->
              <div style="text-align: center; margin: 35px 0 10px;">
                <a href="#" style="display: inline-block; padding: 14px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 600; font-size: 15px;">
                  Get Started →
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="text-align: center; padding: 25px 30px; background-color: #0f0f17; border-radius: 0 0 16px 16px; border: 1px solid rgba(255,255,255,0.06); border-top: none;">
              <p style="color: #5a5a7a; margin: 0; font-size: 12px;">
                © 2026 CareerLens AI. Built with ❤️ for your career growth.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `Welcome to CareerLens AI, ${userName}!\n\nWe're excited to help you grow your career. Our AI-powered platform provides:\n\n• Resume Analysis - AI-powered resume parsing and insights\n• ATS Optimization - Beat applicant tracking systems\n• AI Mock Interviews - Practice with intelligent AI interviewer\n• Career Feedback - Personalized career roadmap\n\nGet started today!\n\n© 2026 CareerLens AI`,
    };

    const info = await transport.sendMail(mailOptions);
    
    // If using Ethereal, log the preview URL
    const previewUrl = nodemailer.getTestMessageUrl(info);
    if (previewUrl) {
      console.log(`📧 Preview welcome email: ${previewUrl}`);
    }

    console.log(`✅ Welcome email sent to ${userEmail}`);
    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`❌ Email send error: ${error.message}`);
    // Don't throw — email failure shouldn't break signup
    return { success: false, error: error.message };
  }
};

module.exports = { sendWelcomeEmail };
