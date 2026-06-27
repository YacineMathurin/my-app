interface ReservationData {
  customerName: string;
  typeCamion: string;
  sessionId: string;
}

export async function validerReservation(data: ReservationData) {
  console.log("Validation de la réservation en base de données :", data);

  // ICI : Ajoute ton code de base de données
  // Exemple : await prisma.reservation.create({ data: { ... } })

  return { success: true };
}
