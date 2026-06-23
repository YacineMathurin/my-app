// import * as z from "zod";

// export const devisSchema = z.object({
//   client_nom: z
//     .string()
//     .min(2, "Le nom du client doit contenir au moins 2 caractères."),
//   type_camion: z.enum(["Frigo", "Plateau", "Benne"], {
//     required_error: "Veuillez sélectionner un type de camion.",
//   }),
//   date: z.string().min(1, "La date de départ est requise."),
//   heure_depart: z.string().min(1, "L'heure de départ est requise."),
//   adresse_depart: z
//     .string()
//     .min(5, "L'adresse de départ doit contenir au moins 5 caractères."),
//   adresse_arrivee: z
//     .string()
//     .min(5, "L'adresse d'arrivée doit contenir au moins 5 caractères."),
// });

// export type DevisFormValues = z.infer<typeof devisSchema>;

export interface DevisResponse {
  success: boolean;
  devis_valide?: {
    client_nom: string;
    type_camion: "Frigo" | "Plateau" | "Benne";
    date: string;
    heure_depart: string;
    heure_retour_estimee: string;
    distance_total_estimée_km: number;
    structure_tarifaire: string;
  };
  paiement?: {
    montant_centimes: number;
    montant_euros: number;
    devise: string;
  };
}
