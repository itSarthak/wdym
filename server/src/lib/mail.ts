import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: process.env.JAVA_MAIL_HOST,
  port: Number(process.env.JAVA_MAIL_PORT),
  secure: false,
  auth: {
    user: process.env.JAVA_MAIL_USERNAME,
    pass: process.env.JAVA_MAIL_PASSWORD,
  },
})

export async function sendOtpEmail(to: string, otp: string) {
  await transporter.sendMail({
    from: `"wdym" <${process.env.JAVA_MAIL_USERNAME}>`,
    to,
    subject: 'Your wdym verification code',
    text: `Your verification code is: ${otp}\n\nThis code expires in 5 minutes. Do not share it with anyone.`,
    html: `
<div style="font-family:ui-sans-serif,system-ui,sans-serif;max-width:420px;margin:0 auto;padding:24px">
  <p style="font-size:18px;font-weight:600;color:#09090b;margin:0 0 6px">Verify your email</p>
  <p style="font-size:14px;color:#71717a;margin:0 0 28px">Enter this code in wdym to complete your sign up. It expires in 5 minutes.</p>
  <div style="background:#f4f4f5;border-radius:8px;padding:24px 0;text-align:center;letter-spacing:12px;font-size:34px;font-weight:700;color:#09090b;font-variant-numeric:tabular-nums">${otp}</div>
  <p style="font-size:12px;color:#a1a1aa;margin:24px 0 0">If you did not sign up for wdym, ignore this email.</p>
</div>`,
  })
}
