import { NextResponse } from "next/server";

// Configuration de la flotte totale théorique du client
// Idéalement, ces valeurs viennent d'Airtable ou d'un fichier de config
const FLOTTE_TOTALE: Record<string, number> = {
  Tautliner: 15,
  Frigo: 10,
  Plateau: 5,
};

export async function GET(request: Request) {
  try {
    // 1. Récupération des paramètres de la requête URL (ex: ?date=2026-06-22&type=Frigo)
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date"); // Format attendu: YYYY-MM-DD
    const typeCamion = searchParams.get("type"); // Ex: Frigo, Tautliner, Plateau

    if (!date || !typeCamion) {
      return NextResponse.json(
        { error: "Les paramètres 'date' et 'type' sont requis." },
        { status: 400 },
      );
    }

    if (!FLOTTE_TOTALE[typeCamion]) {
      return NextResponse.json(
        { error: `Type de camion '${typeCamion}' inconnu.` },
        { status: 400 },
      );
    }

    // 2. Définir les bornes de la journée en format ISO pour l'API Google
    const timeMin = `${date}T00:00:00Z`;
    const timeMax = `${date}T23:59:59Z`;

    const calendarId = process.env.GOOGLE_CALENDAR_ID;
    const apiKey = process.env.GOOGLE_API_KEY;

    // 3. Appel à l'API Google Calendar pour récupérer les événements de cette journée
    // On filtre avec q pour ne chercher que les camions du type demandé (ex: "Frigo")
    const googleCalendarUrl = `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?timeMin=${timeMin}&timeMax=${timeMax}&q=${typeCamion}&singleEvents=true&key=${apiKey}`;

    const response = await fetch(googleCalendarUrl, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
      next: { revalidate: 60 }, // Optionnel : Cache le résultat pendant 60 secondes pour économiser les quotas API
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Erreur Google API:", errorData);
      return NextResponse.json(
        { error: "Impossible de récupérer le planning de Google Calendar." },
        { status: 500 },
      );
    }

    const data = await response.json();
    const evenementsOccupes = data.items || [];

    // 4. LE CALCUL AUTOMATIQUE
    // Nombre d'événements trouvés = nombre de camions occupés de ce type
    const camionsOccupes = evenementsOccupes.length;
    const capaciteMaximale = FLOTTE_TOTALE[typeCamion];
    const camionsDisponibles = Math.max(0, capaciteMaximale - camionsOccupes);

    // 5. Réponse structurée pour Vapi ou ton Airtable
    return NextResponse.json({
      date,
      type_camion: typeCamion,
      flotte_totale: capaciteMaximale,
      camions_occupes: camionsOccupes,
      camions_disponibles: camionsDisponibles,
      statut: camionsDisponibles > 0 ? "DISPONIBLE" : "COMPLET",
    });
  } catch (error) {
    console.error("Erreur serveur API:", error);
    return NextResponse.json(
      { error: "Erreur interne du serveur." },
      { status: 500 },
    );
  }
}
