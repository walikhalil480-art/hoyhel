import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: Number(process.env.SMTP_PORT) || 1025,
  secure: false,
});

export async function processEmailJob(job: { data: { to: string; subject: string; template: string; context: any } }) {
  const { to, subject, template, context } = job.data;

  const html = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0b0f19; color: #ffffff; padding: 30px; border-radius: 12px; border: 1px solid #1e293b;">
      <div style="text-align: center; padding-bottom: 20px; border-bottom: 1px solid #1e293b;">
        <h1 style="color: #38bdf8; font-size: 28px; margin: 0;">LUXEHAVEN</h1>
        <p style="color: #94a3b8; font-size: 14px; margin-top: 4px;">Exclusive Property Rentals & Stays</p>
      </div>
      <div style="padding: 24px 0;">
        <h2 style="font-size: 20px; color: #f8fafc;">${subject}</h2>
        <p style="line-height: 1.6; color: #cbd5e1;">Dear ${context.name || 'Valued Guest'},</p>
        <p style="line-height: 1.6; color: #cbd5e1;">${context.message || 'Thank you for choosing LuxeHaven for your luxury stay.'}</p>
        ${context.bookingNumber ? `<div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0;"><strong style="color: #38bdf8;">Booking #:</strong> ${context.bookingNumber}<br/><strong style="color: #38bdf8;">Total Amount:</strong> $${context.totalPrice}</div>` : ''}
      </div>
      <div style="text-align: center; border-top: 1px solid #1e293b; padding-top: 20px; color: #64748b; font-size: 12px;">
        &copy; 2026 LuxeHaven Platform Inc. All rights reserved.
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: '"LuxeHaven Team" <no-reply@luxehaven.com>',
    to,
    subject,
    html,
  });

  console.log(`✉️ Email dispatched to ${to} (${subject})`);
}
