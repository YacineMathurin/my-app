import { NextResponse } from "next/server";
import { google, calendar_v3 } from "googleapis";

const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/calendar"], // Écriture nécessaire ici
});

const calendar: calendar_v3.Calendar = google.calendar({
  version: "v3",
  auth: jwtClient,
});

/*
{
  "client_nom": "Client Test Entrepôt",
  "volume_m3": 45,
  "date_arrivee": "2026-07-10",
  "duree_semaines": 3,
  "prix_paye": 213.50
}
*/

export async function POST(request: Request) {
  try {
    // Make (Scénario C) envoie les données issues de Stripe
    const { client_nom, volume_m3, date_arrivee, duree_semaines, prix_paye } =
      await request.json();

    const startDateTime = new Date(`${date_arrivee}T08:00:00`);
    const endDateTime = new Date(
      startDateTime.getTime() + duree_semaines * 7 * 24 * 60 * 60 * 1000,
    );
    endDateTime.setHours(18, 0, 0);

    // INSERTION DIRECTE DANS L'AGENDA
    const googleEventBody: calendar_v3.Schema$Event = {
      summary: `[${volume_m3}m³] - ${client_nom}`,
      description: `✅ PAYÉ ET RÉSÉRVÉ\n\nClient : ${client_nom}\nVolume occupé : ${volume_m3} m³\nDurée : ${duree_semaines} semaines\nPrix payé : ${prix_paye} € HT`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Europe/Paris",
      },
      end: { dateTime: endDateTime.toISOString(), timeZone: "Europe/Paris" },
      colorId: "6",
    };

    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: googleEventBody,
    });

    return NextResponse.json({
      success: true,
      message: "Réservation inscrite dans l'agenda avec succès.",
      google_event_id: response.data.id,
    });
  } catch (error: unknown) {
    return NextResponse.json(
      {
        error: "Erreur lors de l'insertion en base" + (error as Error).message,
      },
      { status: 500 },
    );
  }
}
