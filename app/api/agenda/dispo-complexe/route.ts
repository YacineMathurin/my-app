import { NextResponse } from "next/server";

async function geocode(adresse: string): Promise<[number, number] | null> {
  try {
    const res = await fetch(
      `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(adresse)}&limit=1`,
    );
    const json = await res.json();
    if (!json.features || json.features.length === 0) return null;
    return json.features[0].geometry.coordinates;
  } catch (error: unknown) {
    console.error("Erreur de géocodage:", (error as Error).message);
    return null;
  }
}

/*
  {
    "client_nom": "Eiffage",
    "type_camion": "Frigo",
    "date": "2026-06-22",
    "heure_depart": "10:00",
    "adresse_depart": "Port de Gennevilliers, Gennevilliers 92230",
    "adresse_arrivee": "Place de la Mairie, Clichy 92110"
  }
*/

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      client_nom,
      type_camion,
      date,
      heure_depart,
      adresse_depart,
      adresse_arrivee,
    } = body;

    if (
      !client_nom ||
      !type_camion ||
      !date ||
      !heure_depart ||
      !adresse_depart ||
      !adresse_arrivee
    ) {
      return NextResponse.json(
        { error: "Données manquantes." },
        { status: 400 },
      );
    }

    // 1. Géocodage et OSRM (Gratuit)
    const gpsDepart = await geocode(adresse_depart);
    const gpsArrivee = await geocode(adresse_arrivee);

    if (!gpsDepart || !gpsArrivee) {
      return NextResponse.json(
        { error: "Adresses introuvables." },
        { status: 400 },
      );
    }

    const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${gpsDepart[0]},${gpsDepart[1]};${gpsArrivee[0]},${gpsArrivee[1]}?overview=false`;
    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    const distanceKm = osrmData.routes[0].distance / 1000;
    const tempsConduiteHeures = osrmData.routes[0].duration / 3600;

    // 2. Calcul du temps de mobilisation (Aller + Retour + Temps fixes)
    const tempsFixesMinutes =
      Number(process.env.TEMPS_CHARGEMENT || 45) +
      Number(process.env.TEMPS_DECHARGEMENT || 45) +
      Number(process.env.TEMPS_SECURITE_TRAFIC || 30);
    const tempsTotalMobilisationHeures =
      tempsConduiteHeures * 2 + tempsFixesMinutes / 60;

    // 3. Heure de retour estimée au dépôt
    const dateDepart = new Date(`${date}T${heure_depart}:00`);
    const dateRetourDepot = new Date(
      dateDepart.getTime() + tempsTotalMobilisationHeures * 60 * 60 * 1000,
    );
    const heureRetourStr = dateRetourDepot
      .toTimeString()
      .split(" ")[0]
      .substring(0, 5);

    // 4. Détection Horaire Bâtard
    const heureDepartNombre = parseInt(heure_depart.split(":")[0]);
    const heureRetourNombre = dateRetourDepot.getHours();
    const estHoraireBatard = heureDepartNombre >= 9 && heureRetourNombre > 13;

    // 5. Calcul des Tarifs
    const pC = Number(process.env.TARIF_KM_FRIGO || 1.6);
    const pH = Number(process.env.TARIF_HEURE_FRIGO || 45.0);
    const priseEnCharge = Number(process.env.PRISE_EN_CHARGE_FRIGO || 150.0);
    const forfaitJournee = Number(process.env.FORFAIT_JOURNEE_FRIGO || 1000.0);

    let prixBrut =
      priseEnCharge + distanceKm * 2 * pC + tempsTotalMobilisationHeures * pH;
    let structureTarifaire = "Standard Tarif Km/Horaire";

    if (estHoraireBatard) {
      prixBrut = forfaitJournee;
      structureTarifaire = "Forfait Journée (Horaire Bâtard)";
    }

    // 6. Application des remises VIP
    const clientsVIP = JSON.parse(process.env.NEXT_PUBLIC_CLIENTS_VIP || "{}");
    let remiseAppliquee = 0;

    if (clientsVIP[client_nom]) {
      remiseAppliquee = estHoraireBatard
        ? clientsVIP[client_nom].remise_batarde || 0
        : clientsVIP[client_nom].remise_standard || 0;
    }
    const prixFinal = prixBrut * (1 - remiseAppliquee);

    // EXTRACTION DU DEVIS SANS INSERTION CALENDAR
    return NextResponse.json({
      success: true,
      devis_valide: {
        client_nom,
        type_camion,
        date,
        heure_depart,
        heure_retour_estimee: heureRetourStr,
        distance_total_estimée_km: Math.round(distanceKm * 2),
        structure_tarifaire: structureTarifaire,
      },
      paiement: {
        montant_centimes: Math.round(prixFinal * 100), // Format requis par Stripe
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
