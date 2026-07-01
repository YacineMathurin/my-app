import { sendBrevoEmail } from "@/lib/email";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  // --- 1. TRAITEMENT SIGNATURES ---
  const dossiersNonSignes = await prisma.dossiers.findMany({
    where: { signed: false, paid: false, contractReminderSent: false },
  });

  for (const dossier of dossiersNonSignes) {
    const response = await fetch(
      `https://api.yousign.com/v3/signature_requests/${dossier.yousignId}`,
      {
        headers: { Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}` },
      },
    );
    const data = await response.json();

    if (data.status === "finished") {
      await prisma.dossiers.update({
        where: { id: dossier.id },
        data: { signed: true },
      });
    } else {
      // Rappel signature uniquement si pas déjà fait
      const signersRes = await fetch(
        `https://api.yousign.com/v3/signature_requests/${dossier.yousignId}/signers`,
        {
          headers: { Authorization: `Bearer ${process.env.YOUSIGN_API_KEY}` },
        },
      );
      const signersData = await signersRes.json();
      const signatureLink = signersData.data[0]?.signature_link;

      if (signatureLink) {
        await sendBrevoEmail(
          dossier.customerEmail,
          "Rappel de signature",
          `Lien : ${signatureLink}`,
        );
        await prisma.dossiers.update({
          where: { id: dossier.id },
          data: { contractReminderSent: true },
        });
      }
    }
  }

  // --- 2. TRAITEMENT PAIEMENTS ---
  const dossiersAPayer = await prisma.dossiers.findMany({
    where: { signed: true, paid: false, paymentReminderSent: false },
  });

  for (const dossier of dossiersAPayer) {
    await sendBrevoEmail(
      dossier.customerEmail,
      "Rappel de paiement",
      `Lien : ${dossier.stripeUrl}`,
    );
    await prisma.dossiers.update({
      where: { id: dossier.id },
      data: { paymentReminderSent: true },
    });
  }

  return NextResponse.json({ success: true });
}
