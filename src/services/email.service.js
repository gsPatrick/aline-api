import { Resend } from "resend";

// Make Resend optional - only initialize if API key is provided
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export const sendEmail = async ({ to, subject, html }) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@10stats.app";

  return resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
};
