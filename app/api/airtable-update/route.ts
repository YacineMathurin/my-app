export async function handlePostPaymentPayload(reqBody: string): Promise<void> {
  // 1. Parse & validate input
  let payload: unknown;
  try {
    payload = JSON.parse(reqBody);
  } catch {
    throw new Error("Invalid JSON payload");
  }

  if (
    typeof payload !== "object" ||
    payload === null ||
    !("object" in payload)
  ) {
    throw new Error("Unexpected payload shape: missing 'object' field");
  }

  const obj = (payload as { object: Record<string, unknown> }).object ?? {};
  const metadata = (obj.metadata ?? {}) as Record<string, string | undefined>;

  const customerEmail = metadata.customerEmail;
  const customerName = metadata.customerName ?? "Client";
  const airtableRecordId = metadata.airtableRecordId;
  const amountPaid =
    typeof obj.amount_total === "number"
      ? (obj.amount_total / 100).toFixed(2) // fix: "49.90" not "49.9"
      : "0.00";

  const errors: string[] = [];

  // 2. Update Airtable
  if (airtableRecordId) {
    const airtableResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/${process.env.AIRTABLE_TABLE_NAME}/${airtableRecordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Statut Paiement": "Payé",
            "Date Paiement": new Date().toISOString(),
          },
        }),
      },
    );

    if (!airtableResponse.ok) {
      const detail = await airtableResponse.json().catch(() => ({}));
      errors.push(
        `Airtable update failed (${airtableResponse.status}): ${JSON.stringify(detail)}`,
      );
    }
  }

  // 3. Send Brevo email notification
  if (customerEmail) {
    const senderEmail = process.env.BREVO_SENDER_EMAIL;
    if (!senderEmail) {
      errors.push("BREVO_SENDER_EMAIL env variable is not set");
    } else {
      const brevoResponse = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY!,
        },
        body: JSON.stringify({
          sender: { name: "ProServices", email: senderEmail },
          to: [{ email: customerEmail, name: customerName }],
          bcc: [
            {
              email: process.env.SHOP_OWNER_EMAIL,
              name: "Propriétaire Boutique",
            },
          ],
          subject: "🎉 Confirmation de votre paiement - Contrat Validé",
          textContent: `Bonjour ${customerName},\n\nNous vous confirmons la bonne réception de votre paiement de ${amountPaid}€. Votre contrat est désormais validé.\n\nMerci pour votre confiance !\n\nL'équipe ProServices`,
        }),
      });

      if (!brevoResponse.ok) {
        const detail = await brevoResponse.json().catch(() => ({}));
        errors.push(
          `Brevo email failed (${brevoResponse.status}): ${JSON.stringify(detail)}`,
        );
      }
    }
  }

  // 4. Surface all errors at once instead of silently swallowing them
  if (errors.length > 0) {
    throw new Error(`handlePostPaymentPayload errors:\n${errors.join("\n")}`);
  }
}
