import { NextRequest, NextResponse } from 'next/server';
import { createConnection } from '@/lib/database';
import crypto from 'crypto';
import { sendPasswordResetEmail } from '@/lib/email';

// Load environment variables - Next.js automatically loads .env.production in production
// Only load dotenv in development or if needed
if (process.env.NODE_ENV !== 'production') {
  const path = require('path');
  require('dotenv').config({ path: path.join(process.cwd(), '.env.local') });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    // Debug environment variables
    console.log('🔍 Environment check in API:');
    console.log('SMTP_USER:', process.env.SMTP_USER ? 'Set' : 'Not set');
    console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'Set' : 'Not set');

    // Validation
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Connect to database
    const connection = await createConnection();

    // Check if user exists
    const [users] = await connection.query(
      'SELECT id, email, name FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    await connection.end();

    if (users.length === 0) {
      // For security, don't reveal if email exists or not
      return NextResponse.json(
        { message: 'If an account with that email exists, we have sent password reset instructions.' },
        { status: 200 }
      );
    }

    const user = users[0];

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000); // 1 hour from now

    // Store reset token in database
    const connection2 = await createConnection();

    await connection2.execute(
      'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?',
      [resetToken, resetTokenExpiry, user.id]
    );

    await connection2.end();

    // Generate reset link
    const resetLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3001'}/reset-password-token?token=${resetToken}`;
    
    // Send email
    try {
      const emailResult = await sendPasswordResetEmail(email, resetLink, user.name);
      
      if (emailResult.success) {
        console.log('✅ Password reset email sent successfully to:', email);
        return NextResponse.json(
          { 
            message: 'If an account with that email exists, we have sent password reset instructions.',
            // In development, include the reset link for testing
            ...(process.env.NODE_ENV === 'development' && { resetLink })
          },
          { status: 200 }
        );
      } else {
        console.error('❌ Failed to send email:', emailResult.error);
        return NextResponse.json(
          { 
            message: 'If an account with that email exists, we have sent password reset instructions.',
            // In development, include the reset link for testing
            ...(process.env.NODE_ENV === 'development' && { resetLink })
          },
          { status: 200 }
        );
      }
    } catch (emailError) {
      console.error('❌ Email service error:', emailError.message);
      return NextResponse.json(
        { 
          message: 'If an account with that email exists, we have sent password reset instructions.',
          // In development, include the reset link for testing
          ...(process.env.NODE_ENV === 'development' && { resetLink }),
          // In development, also include email error for debugging
          ...(process.env.NODE_ENV === 'development' && { emailError: emailError.message })
        },
        { status: 200 }
      );
    }

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
