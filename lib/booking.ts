import { NextResponse } from "next/server";
import { google, calendar_v3 } from "googleapis";

const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/calendar"],
});

const calendar: calendar_v3.Calendar = google.calendar({
  version: "v3",
  auth: jwtClient,
});

export async function validerReservation(data: {
  customerName: string;
  typeCamion: string;
  dateDepart: string;
  heureDepart: string;
  heureArrive: string;
  prix: string;
}) {
  try {
    const {
      customerName,
      typeCamion,
      dateDepart,
      heureDepart,
      heureArrive,
      prix,
    } = data;

    // 1. Construct correct Date objects
    // Format: "YYYY-MM-DDTHH:mm:ss"
    const startDateTime = new Date(`${dateDepart}T${heureDepart}:00`);
    const endDateTime = new Date(`${dateDepart}T${heureArrive}:00`);

    // 2. Build the event body (volume and dureSemaines removed)
    const googleEventBody: calendar_v3.Schema$Event = {
      summary: `Réservation - ${customerName}`,
      description: `✅ PAYÉ ET RÉSÉRVÉ\n\nClient : ${customerName}\nType de camion : ${typeCamion}\nPrix payé : ${prix} € HT`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Europe/Paris",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Europe/Paris",
      },
      colorId: "6",
    };

    // 3. Insert into Calendar
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
    console.error("Calendar API Error:", error);
    return NextResponse.json(
      {
        error:
          "Erreur lors de l'insertion dans l'agenda: " +
          (error as Error).message,
      },
      { status: 500 },
    );
  }
}
