import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma"; // Ton instance singleton

export async function POST(req: Request) {
  const body = await req.json();

  // 1. Vérifier si c'est l'événement de signature terminée
  if (body.event === "signature_request.finished") {
    const signatureRequestId = body.data.id;

    // 2. Mettre à jour le dossier dans Prisma
    try {
      await prisma.dossiers.update({
        where: { yousignId: signatureRequestId },
        data: {
          signed: true,
        },
      });

      // 3. ICI : Tu déclenches l'envoi de l'email avec le lien de paiement
      // (En récupérant le stripeUrl qui est déjà dans ta BDD)
    } catch (err: unknown) {
      return NextResponse.json(
        { error: "Dossier introuvable" + err },
        { status: 404 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
