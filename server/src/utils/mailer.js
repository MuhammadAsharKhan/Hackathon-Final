import { config } from "../config/env.js";

const RESEND_URL = "https://api.resend.com/emails";

// Without a Resend key, development prints the email instead of failing.
export const sendEmail = async ({ to, subject, text, html }) => {
  if (!config.resendApiKey) {
    if (config.isProduction) {
      console.error("RESEND_API_KEY is not set, email not sent");
      return false;
    }

    console.log(`[dev only] Email to ${to}\n${text}`);
    return true;
  }

  try {
    const response = await fetch(RESEND_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: config.mailFrom,
        to: [to],
        subject,
        text,
        html,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      console.error(`Resend rejected an email with status ${response.status}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Email could not be sent: ${error.message}`);
    return false;
  }
};
