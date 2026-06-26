// import { NextResponse } from "next/server";
// import Stripe from "stripe";

// const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST!, {
//   apiVersion: "2026-05-27.dahlia",
// });

// export async function POST(req: Request) {
//   const body = await req.text();
//   const sig = req.headers.get("stripe-signature")!;

//   let event: Stripe.Event;

//   try {
//     event = stripe.webhooks.constructEvent(
//       body,
//       sig,
//       process.env.STRIPE_WEBHOOK_SECRET!,
//     );
//   } catch (err) {
//     return NextResponse.json(
//       { error: `Webhook Error: ${(err as Error).message}` },
//       { status: 400 },
//     );
//   }

//   // ── Dès que le paiement est confirmé ──────────────────────────────
//   if (event.type === "checkout.session.completed") {
//     const session = event.data.object as Stripe.Checkout.Session;
//     const metadata = session.metadata;

//     if (metadata) {
//       try {
//         // 1. Créer la demande YouSign
//         const signatureUrl = await createYouSignRequest(
//           process.env.YOUSIGN_KEY!,
//           process.env.YOUSIGN_TEMPLATE_ID!,
//           metadata.customerName,
//           metadata.customerPhone,
//           metadata.customerEmail,
//           "https://ton-site.com/merci", // URL de redirection après signature
//           [], // Tes customFields ici
//         );

//         // 2. Envoyer l'email Brevo
//         await sendBrevoEmail(
//           process.env.BREVO_KEY!,
//           metadata.customerName,
//           metadata.customerEmail,
//           signatureUrl,
//         );
//       } catch (err) {
//         console.error("Erreur Webhook process:", err);
//       }
//     }
//   }

//   return NextResponse.json({ received: true });
// }
