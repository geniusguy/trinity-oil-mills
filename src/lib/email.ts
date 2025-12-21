import nodemailer from 'nodemailer';

// Load environment variables - Next.js automatically loads .env.production in production
// Only load dotenv in development or if needed
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
}

// Create a transporter using SMTP env vars
const createTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const emailUser = process.env.SMTP_USER || process.env.EMAIL_USER || 'wemarketgaruda@gmail.com';
  const emailPass = process.env.SMTP_PASSWORD || process.env.EMAIL_PASS || 'whmg apbm nzhx rlxx';

  console.log('🔍 Using email credentials:', {
    host,
    port,
    user: emailUser ? 'Set' : 'Not set',
    pass: emailPass ? 'Set' : 'Not set'
  });

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user: emailUser,
      pass: emailPass,
    },
  });
};

export const sendPasswordResetEmail = async (email: string, resetLink: string, userName: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.SMTP_EMAIL_FROM || process.env.SMTP_USER || process.env.EMAIL_USER,
      to: email,
      subject: 'Trinity Oil Mills - Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0;">Trinity Oil Mills</h1>
            <p style="color: #6b7280; margin: 5px 0;">Management System</p>
          </div>
          
          <div style="background-color: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Password Reset Request</h2>
            <p style="color: #374151; line-height: 1.6;">
              Hello ${userName},
            </p>
            <p style="color: #374151; line-height: 1.6;">
              We received a request to reset your password for your Trinity Oil Mills account. 
              If you made this request, click the button below to reset your password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetLink}" 
                 style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #374151; line-height: 1.6; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #4f46e5; font-size: 14px; word-break: break-all; background-color: #f3f4f6; padding: 10px; border-radius: 4px;">
              ${resetLink}
            </p>
          </div>
          
          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
            <p style="color: #92400e; margin: 0; font-size: 14px;">
              <strong>Security Notice:</strong> This link will expire in 1 hour for your security. 
              If you didn't request this password reset, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>This email was sent from Trinity Oil Mills Management System</p>
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Password reset email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return { success: false, error: error };
  }
};

export const sendWelcomeEmail = async (email: string, userName: string, role: string) => {
  try {
    const transporter = createTransporter();
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Welcome to Trinity Oil Mills Management System',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #4f46e5; margin: 0;">Trinity Oil Mills</h1>
            <p style="color: #6b7280; margin: 5px 0;">Management System</p>
          </div>
          
          <div style="background-color: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #1f2937; margin-top: 0;">Welcome to Trinity Oil Mills!</h2>
            <p style="color: #374151; line-height: 1.6;">
              Hello ${userName},
            </p>
            <p style="color: #374151; line-height: 1.6;">
              Your account has been successfully created with the role: <strong>${role}</strong>
            </p>
            <p style="color: #374151; line-height: 1.6;">
              You can now access the Trinity Oil Mills Management System and start managing your business operations.
            </p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/login" 
               style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 500;">
              Sign In to Your Account
            </a>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>This email was sent from Trinity Oil Mills Management System</p>
            <p>If you have any questions, please contact your system administrator.</p>
          </div>
        </div>
      `,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', result.messageId);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error };
  }
};
