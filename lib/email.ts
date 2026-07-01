// lib/email.ts

export async function sendBrevoEmail(
  targetEmail: string,
  subject: string,
  textContent: string,
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": process.env.BREVO_API_KEY || "",
    },
    body: JSON.stringify({
      sender: {
        name: process.env.COMPANY_NAME || "",
        email: process.env.COMPANY_EMAIL || "",
      },
      to: [{ email: targetEmail, name: "Admin" }],
      subject: subject,
      textContent: textContent,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erreur Brevo : ${JSON.stringify(errorData)}`);
  }
}
