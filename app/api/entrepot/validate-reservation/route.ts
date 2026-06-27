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
  "volume": 45,
  "dateArrivee": "2026-07-10",
  "dureSemaines": 3,
  "prix": 213.50
}
*/

export async function POST(request: Request) {
  try {
    // Make (Scénario C) envoie les données issues de Stripe
    const { customerName, volume, dateArrivee, dureSemaines, prix } =
      await request.json();

    const startDateTime = new Date(`${dateArrivee}T08:00:00`);
    const endDateTime = new Date(
      startDateTime.getTime() + dureSemaines * 7 * 24 * 60 * 60 * 1000,
    );
    endDateTime.setHours(18, 0, 0);

    // INSERTION DIRECTE DANS L'AGENDA
    const googleEventBody: calendar_v3.Schema$Event = {
      summary: `[${volume}m³] - ${customerName}`,
      description: `✅ PAYÉ ET RÉSÉRVÉ\n\nClient : ${customerName}\nVolume occupé : ${volume} m³\nDurée : ${dureSemaines} semaines\nPrix payé : ${prix} € HT`,
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
