import { NextResponse } from "next/server";
import { google, calendar_v3 } from "googleapis";

// Variables d'environnement
const CAPACITE_MAX_M3 = parseInt(
  process.env.CAPACITE_MAX_ENTREPOT_M3 || "500",
  10,
);
const TARIF_M3_SEMAINE = parseFloat(
  process.env.TARIF_M3_PAR_SEMAINE || "15.50",
);
const FRAIS_FIXES = parseFloat(
  process.env.FRAIS_DOSSIER_MANUTENTION_FIXE || "45.00",
);

const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/calendar.readonly"], // Read-only suffit ici !
});

const calendar: calendar_v3.Calendar = google.calendar({
  version: "v3",
  auth: jwtClient,
});

/*
{
  "volume_m3": 45,
  "date_arrivee": "2026-07-10",
  "duree_semaines": 3
}
*/
export async function POST(request: Request) {
  try {
    const { volume_m3, date_arrivee, duree_semaines } = await request.json();

    const startDateTime = new Date(`${date_arrivee}T08:00:00`);
    const endDateTime = new Date(
      startDateTime.getTime() + duree_semaines * 7 * 24 * 60 * 60 * 1000,
    );
    endDateTime.setHours(18, 0, 0);

    // 1. VÉRIFICATION DE LA DISPONIBILITÉ (Lecture Google Calendar)
    const listResponse = await calendar.events.list({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      timeMin: startDateTime.toISOString(),
      timeMax: endDateTime.toISOString(),
      singleEvents: true,
    });

    const evenementsExistants = listResponse.data.items || [];
    let maxVolumeOccupeSurLaPeriode = 0;

    // Simulation jour par jour
    for (
      let d = new Date(startDateTime);
      d < endDateTime;
      d.setDate(d.getDate() + 1)
    ) {
      d.setHours(12, 0, 0);
      let volumeDuJour = 0;

      for (const event of evenementsExistants) {
        const evStart = event.start?.dateTime
          ? new Date(event.start.dateTime)
          : new Date(event.start?.date || "");
        const evEnd = event.end?.dateTime
          ? new Date(event.end.dateTime)
          : new Date(event.end?.date || "");

        if (d >= evStart && d <= evEnd) {
          const match = event.description?.match(
            /Volume occupé :\s*(\d+)\s*m³/,
          );
          if (match && match[1]) volumeDuJour += parseInt(match[1], 10);
        }
      }
      if (volumeDuJour > maxVolumeOccupeSurLaPeriode)
        maxVolumeOccupeSurLaPeriode = volumeDuJour;
    }

    const espaceDisponibleMinimum =
      CAPACITE_MAX_M3 - maxVolumeOccupeSurLaPeriode;

    // 2. REJET SI PLUS DE PLACE
    if (volume_m3 > espaceDisponibleMinimum) {
      return NextResponse.json({
        success: false,
        message_pour_ia: `Désolé, nous n'avons pas la capacité suffisante pour cette période. L'espace disponible maximum est de ${espaceDisponibleMinimum} mètres cubes.`,
      });
    }

    // 3. CALCUL DU DEVIS (Sans rien écrire en base)
    const coutStockageHT = volume_m3 * TARIF_M3_SEMAINE * duree_semaines;
    const prixFinalHT = coutStockageHT + FRAIS_FIXES;

    return NextResponse.json({
      success: true,
      prix_final_ht: prixFinalHT,
      message_pour_ia: `Le montant estimé pour le stockage de ${volume_m3} mètres cubes pendant ${duree_semaines} semaines est de ${prixFinalHT} euros hors taxes. Est-ce que cela vous convient pour valider la réservation ?`,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      { error: "Erreur serveur" + (error as Error).message },
      { status: 500 },
    );
  }
}
