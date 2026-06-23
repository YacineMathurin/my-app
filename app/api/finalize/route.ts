import { NextResponse } from "next/server";
import Stripe from "stripe";

// ── Types ────────────────────────────────────────────────────────────────────

interface RequestBody {
  customerPhone: string;
  customerName: string;
  amount: number;
  customerEmail: string;
  recordId: string; // Optional Airtable record ID
}

function isRequestBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== "object") return false;
  const { customerPhone, customerEmail, customerName, amount, recordId } =
    body as Record<string, unknown>;
  return (
    typeof customerPhone === "string" &&
    typeof customerEmail === "string" &&
    customerEmail.trim() !== "" &&
    customerPhone.trim() !== "" &&
    typeof customerName === "string" &&
    customerName.trim() !== "" &&
    typeof amount === "number" &&
    amount > 0 &&
    (typeof recordId === "string" || recordId === undefined)
  );
}

// ── Env validation ───────────────────────────────────────────────────────────

interface Env {
  stripeKey: string;
  yousignKey: string;
  yousignTemplateId: string;
  brevoKey: string;
}

function getEnv(): Env {
  const stripeKey = process.env.STRIPE_SECRET_KEY_TEST;
  const yousignKey = process.env.YOUSIGN_API_KEY_SANDBOX;
  const yousignTemplateId = process.env.YOUSIGN_DOCUMENT_TEMPLATE_ID_SANDBOX;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!stripeKey || !yousignKey || !yousignTemplateId || !brevoKey) {
    throw new Error("Missing required environment variables");
  }

  return { stripeKey, yousignKey, yousignTemplateId, brevoKey };
}

// ── Step helpers ─────────────────────────────────────────────────────────────

async function createStripePaymentLink(
  stripe: Stripe,
  customerName: string,
  customerEmail: string, // 💡 Ajoutez l'email (ou un airtableRecordId)
  customerPhone: string, // 💡 Ajoutez le numéro de téléphone
  amount: number,
  recordId: string, // 💡 Ajoutez l'ID du record Airtable
): Promise<string> {
  const price = await stripe.prices.create({
    currency: "eur",
    unit_amount: Math.round(amount * 100),
    product_data: {
      name: `Contrat et Prestation - ${customerName}`,
    },
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],

    // 💡 PASSEZ LES METADATA POUR MAKE.COM
    metadata: {
      // Customer
      customerEmail: customerEmail,
      customerName: customerName,
      customerPhone: customerPhone,
      content: `Votre reservation pour la prestation de services. Montant: ${amount} EUR est validés. Merci pour votre confiance!`,
      recordId: recordId,
      // Sender
      senderName: "AutomatPro",
      senderPhone: "+33612345678",
      ccName: "AutomatPro",
      ccEmail: "yacinemathurin@gmail.com",
    },
  });

  return paymentLink.url;
}

async function createYouSignRequest(
  yousignKey: string,
  yousignTemplateId: string,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
  stripeUrl: string,
): Promise<string> {
  // ── Step 1: Create the signature request (no signers here with template_id) ──
  const requestResponse = await fetch(
    "https://api-sandbox.yousign.app/v3/signature_requests",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yousignKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrat de prestation - ${customerName}`,
        delivery_mode: "none",
        template_id: yousignTemplateId,
        timezone: "Europe/Paris",
        // custom_fields: {
        //   dateDebut: "2026-06-22",
        //   heureDepart: "10:00",
        //   heureRetourEstimee: "12:16",
        //   distanceTotalEstimeKm: "10",
        //   typeCamion: "Frigo",
        // },
        // Fix: Use template_placeholders instead of template_signers
        template_placeholders: {
          signers: [
            {
              label: "client", // Fix: Use 'label' to match your template's placeholder name
              info: {
                first_name: customerName,
                last_name: "Client",
                email: customerEmail,
                phone_number: customerPhone,
                locale: "fr",
              },
              signature_authentication_mode: "no_otp",
              redirect_urls: {
                success: stripeUrl,
              },
            },
          ],
        },
      }),
    },
  );

  if (!requestResponse.ok) {
    const error: unknown = await requestResponse.json();
    throw new Error(
      `YouSign signature_request error: ${JSON.stringify(error)}`,
    );
  }

  const requestData: unknown = await requestResponse.json();
  if (
    !requestData ||
    typeof requestData !== "object" ||
    !("id" in requestData) ||
    typeof (requestData as Record<string, unknown>).id !== "string"
  ) {
    throw new Error("Réponse YouSign signature_request invalide");
  }

  const signatureRequestId = (requestData as { id: string }).id;

  // ── Step 3: Activate ──────────────────────────────────────────────────────
  const activateResponse = await fetch(
    `https://api-sandbox.yousign.app/v3/signature_requests/${signatureRequestId}/activate`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${yousignKey}` },
      body: JSON.stringify({
        sender_id: "fbb46100-4aa7-4b44-bdac-e467167fac8b", // Replace with your actual YouSign User UUID
      }),
    },
  );

  if (!activateResponse.ok) {
    const error: unknown = await activateResponse.json();
    throw new Error(`YouSign activate error: ${JSON.stringify(error)}`);
  }

  const activateData: unknown = await activateResponse.json();
  if (
    !activateData ||
    typeof activateData !== "object" ||
    !("signers" in activateData) ||
    !Array.isArray((activateData as { signers: unknown[] }).signers)
  ) {
    throw new Error("Réponse YouSign activate invalide");
  }

  const firstSigner: unknown = (activateData as { signers: unknown[] })
    .signers[0];
  if (
    !firstSigner ||
    typeof firstSigner !== "object" ||
    !("signature_link" in firstSigner) ||
    typeof (firstSigner as Record<string, unknown>).signature_link !== "string"
  ) {
    throw new Error("signature_link manquant après activation");
  }

  return (firstSigner as { signature_link: string }).signature_link;
}

async function sendBrevoEmail(
  brevoKey: string,
  customerName: string,
  customerEmail: string, // Change parameter from phone to email
  signatureUrl: string,
): Promise<void> {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "api-key": brevoKey,
    },
    body: JSON.stringify({
      sender: { name: "AutomatPro", email: "yacinemathurin@gmail.com" }, // Must be a validated sender in your Brevo account
      to: [{ email: customerEmail, name: customerName }],
      subject: "Votre contrat est prêt à être signé",
      textContent: `Bonjour ${customerName}, merci pour votre accord. Veuillez cliquer sur ce lien pour signer votre contrat. Vous serez ensuite redirigé vers notre page de paiement sécurisé : ${signatureUrl}`,
    }),
  });

  if (!response.ok) {
    const error: unknown = await response.json();
    throw new Error(`Brevo Email error: ${JSON.stringify(error)}`);
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

// curl -X POST http://localhost:3000/api/your-route-name \
//   -H "Content-Type: application/json" \
//   -d '{
//     "customerPhone": "+33612345678",
//     "customerName": "Jean Dupont",
//     "amount": 150
//   }'
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const env = getEnv();
    const body: unknown = await request.json();

    if (!isRequestBody(body)) {
      return NextResponse.json(
        { error: "Données requises manquantes ou invalides." },
        { status: 400 },
      );
    }

    const { customerPhone, customerEmail, customerName, amount, recordId } =
      body;

    const stripe = new Stripe(env.stripeKey, {
      apiVersion: "2026-05-27.dahlia",
    });

    const stripeUrl = await createStripePaymentLink(
      stripe,
      customerName,
      customerEmail,
      customerPhone,
      amount,
      recordId,
    );

    const signatureUrl = await createYouSignRequest(
      env.yousignKey,
      env.yousignTemplateId,
      customerName,
      customerPhone,
      customerEmail,
      stripeUrl,
    );
    await sendBrevoEmail(
      env.brevoKey,
      customerName,
      customerEmail,
      signatureUrl,
    );

    return NextResponse.json(
      {
        status: "success",
        message:
          "Lien de paiement créé, contrat YouSign envoyé, SMS Brevo expédié.",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur dans le tunnel d'automatisation:", message);
    return NextResponse.json(
      {
        error: "Échec du traitement du tunnel de validation.",
        details: message,
      },
      { status: 500 },
    );
  }
}
