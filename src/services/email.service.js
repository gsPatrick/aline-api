import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  const fromEmail = process.env.RESEND_FROM_EMAIL || "noreply@10stats.app";

  return resend.emails.send({
    from: fromEmail,
    to,
    subject,
    html,
  });
};
