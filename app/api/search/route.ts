import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // On récupère le numéro de téléphone envoyé par le webhook
    const { customerPhone } = body;

    if (!customerPhone) {
      return NextResponse.json(
        { error: "Numéro de téléphone manquant" },
        { status: 400 },
      );
    }

    // Configuration des accès Airtable (à mettre dans tes variables d'environnement .env)
    const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN; // Commence par pat.xxx
    const BASE_ID = process.env.AIRTABLE_BASE_ID; // Commence par appxxx
    const TABLE_NAME = encodeURIComponent("Clients"); // Nom de ta table

    // Formule Airtable pour chercher le téléphone exact (gère le format international ou local)
    // Exemple : {Telephone} = '+33612345678'
    const filterByFormula = `{Telephone} = '${customerPhone}'`;

    // Appel à l'API de Airtable en natif (pas besoin de SDK lourd)
    const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${TABLE_NAME}?filterByFormula=${encodeURIComponent(filterByFormula)}&maxRecords=1`;

    const response = await fetch(airtableUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      // Optionnel : évite le cache de Vercel pour avoir les données en temps réel
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur Airtable:", errorData);
      return NextResponse.json(
        { error: "Erreur lors de la recherche Airtable" },
        { status: 500 },
      );
    }

    const data = await response.json();

    // ─── ANALYSE DU RÉSULTAT ───
    if (data.records && data.records.length > 0) {
      const clientRecord = data.records[0];

      // On renvoie les infos utiles à Make / Vapi
      return NextResponse.json(
        {
          found: true,
          id: clientRecord.id,
          name: clientRecord.fields.Nom, // Nom de ton champ dans Airtable
          hasActiveContract: clientRecord.fields.ContratActif || false,
          amountDue: clientRecord.fields.MontantDu || 0,
        },
        { status: 200 },
      );
    }

    // Si aucun client n'est trouvé
    return NextResponse.json(
      { found: false, message: "Client inconnu" },
      { status: 200 },
    );
  } catch (error: any) {
    console.error("Erreur Route API Search:", error.message);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 },
    );
  }
}
