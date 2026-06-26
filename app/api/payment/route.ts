import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST!, {
  apiVersion: "2026-05-27.dahlia",
});

async function createStripePaymentLink(
  customerName: string,
  customerEmail: string,
  customerPhone: string,
  amount: number,
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
    metadata: {
      // Customer
      customerEmail,
      customerName,
      customerPhone,
      content: `Votre reservation pour la prestation de services. Montant: ${amount} EUR est validés. Merci pour votre confiance!`,
      // Sender
      senderName: "AutomatPro",
      senderPhone: "+33612345678",
      ccName: "AutomatPro",
      ccEmail: "yacinemathurin@gmail.com",
    },
  });

  return paymentLink.url;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, customerEmail, customerPhone, amount } = body;

    // Validation
    if (!customerName || !customerEmail || !customerPhone || !amount) {
      return NextResponse.json(
        {
          error:
            "Champs requis manquants : customerName, customerEmail, customerPhone, amount.",
        },
        { status: 400 },
      );
    }

    if (typeof amount !== "number" || amount <= 0) {
      return NextResponse.json(
        { error: "Le montant doit être un nombre positif." },
        { status: 400 },
      );
    }

    const url = await createStripePaymentLink(
      customerName,
      customerEmail,
      customerPhone,
      amount,
    );

    return NextResponse.json({ url }, { status: 201 });
  } catch (error) {
    if (error instanceof Stripe.errors.StripeError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode ?? 500 },
      );
    }

    console.error("Erreur inattendue :", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }
}
