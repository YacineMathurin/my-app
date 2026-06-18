import { NextResponse } from "next/server";
import Stripe from "stripe";

// ── Types ────────────────────────────────────────────────────────────────────

interface RequestBody {
  customerPhone: string;
  customerName: string;
  amount: number;
}

interface YouSignSigner {
  signature_link: string;
}

interface YouSignResponse {
  signers: YouSignSigner[];
}

function isRequestBody(body: unknown): body is RequestBody {
  if (!body || typeof body !== "object") return false;
  const { customerPhone, customerName, amount } = body as Record<string, unknown>;
  return (
    typeof customerPhone === "string" && customerPhone.trim() !== "" &&
    typeof customerName === "string" && customerName.trim() !== "" &&
    typeof amount === "number" && amount > 0
  );
}

function isYouSignResponse(data: unknown): data is YouSignResponse {
  return (
    !!data &&
    typeof data === "object" &&
    "signers" in data &&
    Array.isArray((data as YouSignResponse).signers) &&
    typeof (data as YouSignResponse).signers[0]?.signature_link === "string"
  );
}

// ── Env validation ───────────────────────────────────────────────────────────

function getEnv(): {
  stripeKey: string;
  yousignKey: string;
  brevoKey: string;
} {
  const stripeKey = process.env.STRIPE_SECRET_KEY_TEST;
  const yousignKey = process.env.YOUSIGN_API_KEY_SANDBOX;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!stripeKey || !yousignKey || !brevoKey) {
    throw new Error("Missing required environment variables");
  }

  return { stripeKey, yousignKey, brevoKey };
}

// ── Step helpers ─────────────────────────────────────────────────────────────

async function createStripePaymentLink(
  stripe: Stripe,
  customerName: string,
  amount: number,
): Promise<string> {
  // Create a reusable Price, then a Payment Link — no success/cancel URL needed
  const price = await stripe.prices.create({
    currency: "eur",
    unit_amount: Math.round(amount * 100),
    product_data: {
      name: `Contrat et Prestation - ${customerName}`,
    },
  });

  const paymentLink = await stripe.paymentLinks.create({
    line_items: [{ price: price.id, quantity: 1 }],
  });

  return paymentLink.url;
}

async function createYouSignRequest(
  yousignKey: string,
  customerName: string,
  customerPhone: string,
  stripeUrl: string,
): Promise<string> {
  const response = await fetch(
    "https://api-sandbox.yousign.app/v3/signature_requests",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${yousignKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: `Contrat de prestation - ${customerName}`,
        delivery_modes: ["none"],
        redirect_options: {
          success: { url: stripeUrl }, // Client lands on Stripe right after signing
        },
        signers: [
          {
            info: {
              first_name: customerName,
              last_name: "Client",
              phone_number: customerPhone,
              locale: "fr",
            },
            signature_authentication_mode: "no_otp",
          },
        ],
      }),
    },
  );

  if (!response.ok) {
    const error: unknown = await response.json();
    throw new Error(`YouSign error: ${JSON.stringify(error)}`);
  }

  const data: unknown = await response.json();
  if (!isYouSignResponse(data)) throw new Error("Réponse YouSign invalide");

  return data.signers[0].signature_link;
}

async function sendBrevoSms(
  brevoKey: string,
  customerName: string,
  customerPhone: string,
  signatureUrl: string,
): Promise<void> {
  const response = await fetch(
    "https://api.brevo.com/v3/transactionalSMS/sms",
    {
      method: "POST",
      headers: {
        accept: "application/json",
        "content-type": "application/json",
        "api-key": brevoKey,
      },
      body: JSON.stringify({
        type: "transactional",
        sender: "ProServices",
        recipient: customerPhone,
        content: `Bonjour ${customerName}, merci pour votre accord. Veuillez cliquer sur ce lien pour signer votre contrat. Vous serez ensuite redirigé vers notre page de paiement sécurisé : ${signatureUrl}`,
      }),
    },
  );

  if (!response.ok) {
    const error: unknown = await response.json();
    throw new Error(`Brevo error: ${JSON.stringify(error)}`);
  }
}

// ── Route handler ────────────────────────────────────────────────────────────

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

    const { customerPhone, customerName, amount } = body;

    const stripe = new Stripe(env.stripeKey, { apiVersion: "2026-05-27.dahlia" });

    const stripeUrl = await createStripePaymentLink(stripe, customerName, amount);
    const signatureUrl = await createYouSignRequest(
      env.yousignKey,
      customerName,
      customerPhone,
      stripeUrl,
    );
    await sendBrevoSms(env.brevoKey, customerName, customerPhone, signatureUrl);

    return NextResponse.json(
      {
        status: "success",
        message: "Lien de paiement créé, contrat YouSign envoyé, SMS Brevo expédié.",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur dans le tunnel d'automatisation:", message);
    return NextResponse.json(
      { error: "Échec du traitement du tunnel de validation.", details: message },
      { status: 500 },
    );
  }
}