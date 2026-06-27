// lib/email.ts

export async function sendBrevoEmail(
  brevoKey: string,
  customerName: string,
  targetEmail: string,
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": brevoKey,
    },
    body: JSON.stringify({
      sender: { name: "AutomatPro", email: "yacinemathurin@gmail.com" },
      to: [{ email: targetEmail, name: "Admin" }],
      subject: "Action requise : Nouveau paiement reçu",
      textContent: `Bonjour, le client ${customerName} vient de payer. Veuillez choisir le chauffeur pour cette mission.`,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Erreur Brevo : ${JSON.stringify(errorData)}`);
  }
}
