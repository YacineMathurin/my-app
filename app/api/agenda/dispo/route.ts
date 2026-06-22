import { NextResponse } from "next/server";

/*
  Structure attendue :
  {
    "type_camion": "Frigo",
    "date": "2026-06-22",
    "heure_depart": "10:00"
  }
*/

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type_camion, date, heure_depart } = body;

    // 1. Validation ultra-rapide
    if (!type_camion || !date || !heure_depart) {
      return NextResponse.json(
        { error: "Données manquantes (Camion, Date ou Heure)." },
        { status: 400 },
      );
    }

    // 2. Tarifs fixes
    const tarifs: Record<string, number> = {
      Frigo: 450,
      Plateau: 350,
      Benne: 400,
    };

    const prixFinal = tarifs[type_camion as keyof typeof tarifs] || 500;

    // 3. Réponse directe
    return NextResponse.json({
      success: true,
      devis: {
        type_camion,
        date,
        heure_depart,
        structure_tarifaire: "Forfait Fixe",
      },
      paiement: {
        montant_centimes: Math.round(prixFinal * 100),
        montant_euros: Math.round(prixFinal),
        devise: "eur",
      },
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Erreur interne: " + (error as Error).message },
      { status: 500 },
    );
  }
}
