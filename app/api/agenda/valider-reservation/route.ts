import { NextResponse } from "next/server";
import { google, calendar_v3 } from "googleapis";

// Définition stricte du contrat d'interface pour le payload de la requête
interface ValidationReservationBody {
  client_nom: string;
  type_camion: string;
  date: string; // Format: YYYY-MM-DD
  heure_depart: string; // Format: HH:MM
  heure_retour: string; // Format: HH:MM (Heure d'arrivée calculée par OSRM)
  trajet?: string;
  structure_tarifaire?: string;
}

// Initialisation sécurisée et typée du client JWT Google Authentication
const jwtClient = new google.auth.JWT({
  email: process.env.GOOGLE_CLIENT_EMAIL,
  key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  scopes: ["https://www.googleapis.com/auth/calendar"],
});
// Instance typée de l'API Google Calendar
const calendar: calendar_v3.Calendar = google.calendar({
  version: "v3",
  auth: jwtClient,
});

export async function POST(request: Request) {
  try {
    // 1. Récupération et typage du corps de la requête
    const body: ValidationReservationBody = await request.json();
    const {
      client_nom,
      type_camion,
      date,
      heure_depart,
      heure_retour,
      trajet,
      structure_tarifaire,
    } = body;

    // Validation stricte des champs obligatoires
    if (
      !client_nom ||
      !type_camion ||
      !date ||
      !heure_depart ||
      !heure_retour
    ) {
      return NextResponse.json(
        {
          error:
            "Données manquantes (client_nom, type_camion, date, heure_depart, heure_retour).",
        },
        { status: 400 },
      );
    }

    // 2. Reconstruction et validation des formats de dates
    const startDateTime: Date = new Date(`${date}T${heure_depart}:00`);
    const endDateTime: Date = new Date(`${date}T${heure_retour}:00`);

    if (isNaN(startDateTime.getTime()) || isNaN(endDateTime.getTime())) {
      return NextResponse.json(
        { error: "Format de date ou d'heure invalide." },
        { status: 400 },
      );
    }

    // 3. Construction du payload de l'événement typé selon la définition Google Calendar
    const googleEventBody: calendar_v3.Schema$Event = {
      summary: `[${type_camion}] - ${client_nom}`,
      description: `RÉSERVATION VALIDÉE ET PAYÉE\n\nClient : ${client_nom}\nCamion : ${type_camion}\nTrajet : ${trajet || "Non spécifié"}\nFacturation : ${structure_tarifaire || "Standard"}`,
      start: {
        dateTime: startDateTime.toISOString(),
        timeZone: "Europe/Paris",
      },
      end: {
        dateTime: endDateTime.toISOString(),
        timeZone: "Europe/Paris",
      },
      colorId: "1",
    };

    console.log(
      `⏳ Insertion de la réservation validée pour : ${client_nom}...`,
    );

    // 4. Appel à l'API via le SDK Google certifié
    const response = await calendar.events.insert({
      calendarId: process.env.GOOGLE_CALENDAR_ID,
      requestBody: googleEventBody,
    });

    // 5. Réponse structurée et typée en cas de succès
    return NextResponse.json({
      success: true,
      message: "Réservation enregistrée avec succès après paiement.",
      google_event_id: response.data.id,
      html_link: response.data.htmlLink,
    });
  } catch (error: unknown) {
    console.error(
      "❌ Erreur serveur lors de l'insertion Google Agenda:",
      error,
    );

    const details = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      {
        error: "Erreur interne du serveur lors de la validation.",
        details,
      },
      { status: 500 },
    );
  }
}
