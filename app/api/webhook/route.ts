// Ton fichier Webhook (route.ts)
import { NextResponse } from "next/server";
import Stripe from "stripe";
import { validerReservation } from "@/lib/booking"; // <--- Fonction logique déplacée
import { sendBrevoEmail } from "@/lib/email"; // <--- Fonction email déplacée

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST!, {
  apiVersion: "2026-05-27.dahlia",
});

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature")!;

  console.log("POST STRIPE PAYMENT WEBHOOK");

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    return NextResponse.json(
      { error: `Webhook Error: ${err}` },
      { status: 400 },
    );
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (metadata) {
      try {
        // 1. Appel direct à la fonction logique (pas de fetch réseau)
        await validerReservation({
          customerName: metadata.customerName,
          typeCamion: metadata.typeCamion,
          sessionId: session.id, // Toujours bon de tracer l'ID Stripe
        });

        // 2. Envoi email
        await sendBrevoEmail(
          process.env.BREVO_API_KEY!,
          metadata.customerName || "Client",
          process.env.BOSS_EMAIL as string,
        );
      } catch (err) {
        console.error("Erreur critique Webhook:", err);
        return NextResponse.json(
          { error: "Echec traitement interne" },
          { status: 500 },
        );
      }
    }
  }

  return NextResponse.json({ received: true });
}
