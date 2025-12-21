# Email Configuration Setup

To enable email functionality for password reset and welcome emails, you need to configure email settings.

## 1. Create `.env.local` file

Create a `.env.local` file in the `oil-shop-web` directory with the following content:

```env
# Database Configuration
DATABASE_URL="mysql://root:@localhost:3306/oil_shop_db_new"

# NextAuth Configuration
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-here"

# Email Configuration (Gmail SMTP)
EMAIL_USER="your-email@gmail.com"
EMAIL_PASS="your-app-password"

# Development Environment
NODE_ENV="development"
```

## 2. Gmail App Password Setup

### Step 1: Enable 2-Factor Authentication
1. Go to your Google Account settings
2. Navigate to Security
3. Enable 2-Step Verification

### Step 2: Generate App Password
1. In Google Account settings, go to Security
2. Under "2-Step Verification", click "App passwords"
3. Select "Mail" and "Other (Custom name)"
4. Enter "Trinity Oil Mills" as the app name
5. Copy the generated 16-character password
6. Use this password as `EMAIL_PASS` in your `.env.local`

### Step 3: Update Environment Variables
Replace the following in your `.env.local`:
- `EMAIL_USER`: Your Gmail address (e.g., `yourname@gmail.com`)
- `EMAIL_PASS`: The 16-character app password from Step 2

## 3. Alternative Email Services

If you prefer not to use Gmail, you can modify `src/lib/email.ts` to use other email services:

### SendGrid
```typescript
const transporter = nodemailer.createTransporter({
  service: 'SendGrid',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY,
  },
});
```

### Mailgun
```typescript
const transporter = nodemailer.createTransporter({
  service: 'Mailgun',
  auth: {
    user: process.env.MAILGUN_USERNAME,
    pass: process.env.MAILGUN_PASSWORD,
  },
});
```

## 4. Testing Email Functionality

1. Start the development server: `npm run dev`
2. Go to the forgot password page: `http://localhost:3000/forgot-password`
3. Enter a valid email address
4. Check your email inbox for the password reset email
5. For development, the reset link is also logged to the console

## 5. Email Templates

The system includes two email templates:
- **Password Reset Email**: Sent when users request password reset
- **Welcome Email**: Sent when new users register

Both emails are professionally designed with:
- Trinity Oil Mills branding
- Clear call-to-action buttons
- Security notices
- Responsive design

## Troubleshooting

### Common Issues:
1. **"Invalid login"**: Check your Gmail app password
2. **"Less secure app access"**: Use app passwords instead
3. **Emails not received**: Check spam folder
4. **SMTP timeout**: Verify internet connection and Gmail settings

### Debug Mode:
In development mode, reset links are also logged to the console for testing purposes.
