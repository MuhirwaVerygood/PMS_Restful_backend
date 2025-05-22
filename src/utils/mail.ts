import { config } from 'dotenv';
import nodemailer, { Transporter } from 'nodemailer';
import { logAction } from 'prisma/prisma-client';

config();

const transporter: Transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false, // Bypass certificate validation
  },
});

// Verify transporter configuration on startup
transporter.verify((error: Error | null, success: boolean) => {
  if (error) {
    console.error('Nodemailer verification failed:', error.message);
    throw new Error('Failed to initialize email transporter');
  }
  console.log('Nodemailer is ready to send emails');
});

// Validate environment variables
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  throw new Error('Missing EMAIL_USER or EMAIL_PASS in environment variables');
}
if (!process.env.CLIENT_URL) {
  throw new Error('Missing CLIENT_URL in environment variables');
}

const sendSlotApprovalEmail = async (
  to: string,
  slotNumber: string,
  plateNumber: string,
  approvedAt: Date
) => {
  try {
    await transporter.sendMail({
      from: `"Vehicle Parking System" <${process.env.EMAIL_USER}>`,
      to,
      subject: 'Parking Slot Approval',
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            h1 { color: #4200FE; }
            p { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>Parking Slot Approved</h1>
            <p>Your parking slot request has been approved.</p>
            <p><strong>Slot Number:</strong> ${slotNumber}</p>
            <p><strong>Vehicle Plate Number:</strong> ${plateNumber}</p>
            <p><strong>Approved At:</strong> ${approvedAt.toLocaleString()}</p>
            <p>Best regards,<br>Vehicle Parking System Team</p>
          </div>
        </body>
        </html>
      `,
    });

    await logAction('system', `Sent slot approval email to ${to} for slot ${slotNumber}`);
    return { message: 'Email sent successfully', status: true };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await logAction('system', `Failed to send slot approval email to ${to}: ${errorMessage}`);
    return { message: 'Unable to send email', status: false };
  }
};
 

export { sendSlotApprovalEmail };