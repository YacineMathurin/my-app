import { NextResponse } from "next/server";
import Stripe from "stripe";
import axios from "axios";

// Initialisation de Stripe (pense à mettre ta clé sk_test_... dans ton .env)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_TEST!, {
  apiVersion: "2023-10-16" as any,
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customerPhone, customerName, amount } = body;

    // Validation rapide des données reçues de Make / Vapi
    if (!customerPhone || !customerName || !amount) {
      return NextResponse.json(
        { error: "Données requises manquantes." },
        { status: 400 },
      );
    }

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 1 : CRÉATION DE LA SESSION DE PAIEMENT STRIPE
    // ──────────────────────────────────────────────────────────────
    const stripeSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: `Contrat et Prestation - ${customerName}`,
            },
            unit_amount: Math.round(amount * 100), // Stripe prend les montants en centimes
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      // Redirections finales une fois que Stripe a terminé le paiement
      success_url: "https://tondomaine.com/paiement-reussi",
      cancel_url: "https://tondomaine.com/paiement-annule",
    });

    const stripeUrl = stripeSession.url; // Notre lien de paiement cible

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 2 : CRÉATION DU CONTRAT YOUSIGN + REDIRECTION VERS STRIPE
    // ──────────────────────────────────────────────────────────────
    const yousignResponse = await axios.post(
      "https://api-sandbox.yousign.app/v3/signature_requests",
      {
        name: `Contrat de prestation - ${customerName}`,
        delivery_modes: ["none"], // 'none' car on gère nous-mêmes l'envoi de l'URL par SMS via Brevo
        redirect_options: {
          success: {
            url: stripeUrl, // ⚡ Le client est automatiquement redirigé vers Stripe dès qu'il signe !
          },
        },
        signers: [
          {
            info: {
              first_name: customerName,
              last_name: "Client",
              phone_number: customerPhone, // Format requis : '+33612345678'
              locale: "fr",
            },
            signature_authentication_mode: "no_otp", // Idéal en test pour fluidifier l'appel
          },
        ],
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.YOUSIGN_API_KEY_SANDBOX}`,
          "Content-Type": "application/json",
        },
      },
    );

    // Extraction du lien de signature unique généré pour ce client
    const signatureUrl = yousignResponse.data.signers[0].signature_link;

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 3 : ENVOI DU SMS GLOBAL VIA BREVO
    // ──────────────────────────────────────────────────────────────
    const smsContent = `Bonjour ${customerName}, merci pour votre accord. Veuillez cliquer sur ce lien pour signer votre contrat. Vous serez ensuite redirigé vers notre page de paiement sécurisé : ${signatureUrl}`;

    await axios.post(
      "https://api.brevo.com/v3/transactionalSMS/sms",
      {
        type: "transactional",
        sender: "ProServices", // Nom de l'expéditeur (11 caractères max alphanumériques)
        recipient: customerPhone, // Numéro du client
        content: smsContent,
      },
      {
        headers: {
          accept: "application/json",
          "content-type": "application/json",
          "api-key": process.env.BREVO_API_KEY, // Ta clé Brevo xkeysib-...
        },
      },
    );

    // ──────────────────────────────────────────────────────────────
    // ÉTAPE 4 : RÉPONSE À MAKE & VAPI
    // ──────────────────────────────────────────────────────────────
    return NextResponse.json(
      {
        status: "success",
        message:
          "Lien Stripe lié à Yousign, et SMS envoyé avec succès via Brevo.",
      },
      { status: 200 },
    );
  } catch (error: any) {
    // Log précis des erreurs d'API externes pour débugger rapidement sur Vercel
    console.error(
      "Erreur dans le tunnel d'automatisation:",
      error?.response?.data || error.message,
    );
    return NextResponse.json(
      {
        error: "Échec du traitement du tunnel de validation.",
        details: error?.response?.data || error.message,
      },
      { status: 500 },
    );
  }
}
