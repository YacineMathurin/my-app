"use client";

import { useState, useCallback } from "react";
import { useForm } from "@tanstack/react-form";
import { z } from "zod";


// Field-level validator factory for TanStack Form onChange
function makeFieldValidator<T extends z.ZodTypeAny>(schema: T) {
  return {
    onChange: ({ value }: { value: unknown }) => {
      const result = schema.safeParse(value);
      if (!result.success) return result.error.issues[0]?.message;
      return undefined;
    },
  };
}

// Form-level validator factory for TanStack Form
function makeFormValidator<T extends z.ZodTypeAny>(schema: T) {
  return {
    onChange: ({ value }: { value: unknown }) => {
      const result = schema.safeParse(value);
      if (!result.success) {
        return {
          fields: Object.fromEntries(
            result.error.issues.map((issue) => [
              issue.path[0],
              issue.message,
            ])
          ),
        };
      }
      return undefined;
    },
  };
}

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

import {
  Truck,
  MapPin,
  Calendar,
  Clock,
  User,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSignature,
  ChevronRight,
  Phone,
  Mail,
  Navigation,
  Ruler,
  Euro,
  Send,
} from "lucide-react";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const TRUCK_VALUES = ["Frigo", "Benne", "Plateau", "Citerne", "Fourgon"] as const;

const step1Schema = z.object({
  client_nom: z.string().min(2, "Minimum 2 caractères"),
  type_camion: z.enum(TRUCK_VALUES, { error: "Veuillez sélectionner un type" }),
  date: z.string().min(1, "La date est requise"),
  heure_depart: z.string().min(1, "L'heure est requise"),
  adresse_depart: z.string().min(5, "Adresse trop courte"),
  adresse_arrivee: z.string().min(5, "Adresse trop courte"),
});

const step3Schema = z.object({
  client_email: z.string().email("Adresse e-mail invalide"),
  client_telephone: z
    .string()
    .regex(/^(\+33|0)[1-9](\d{2}){4}$/, "Numéro de téléphone invalide"),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step3Data = z.infer<typeof step3Schema>; // used by form3 submit value
type Step = 1 | 2 | 3 | 4 | "error";

interface DispoResponse {
  devis_valide?: {
    type_camion: string;
    date: string;
    heure_depart: string;
    distance_total_estimée_km?: string | number;
  };
  paiement?: { montant_euros: string | number };
  message?: string;
  [key: string]: unknown;
}

const TRUCK_ICONS: Record<string, string> = {
  Frigo: "❄️",
  Benne: "🪣",
  Plateau: "🚛",
  Citerne: "🛢️",
  Fourgon: "📦",
};

const STEPS = [
  { n: 1, label: "Mission" },
  { n: 2, label: "Récapitulatif" },
  { n: 3, label: "Contact" },
  { n: 4, label: "Confirmation" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function FieldError({ errors }: { errors: string[] }) {
  if (!errors.length) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-red-500 mt-1.5">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {errors[0]}
    </p>
  );
}

function SectionLabel({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-4 mt-8 first:mt-0">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50 text-blue-600">
        <Icon className="h-3.5 w-3.5" />
      </div>
      <span className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <div className="flex-1 h-px bg-slate-100" />
    </div>
  );
}

function RecapItem({
  icon: Icon,
  label,
  value,
  accent = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 py-3 border-b border-slate-100 last:border-0 ${accent ? "bg-blue-50/50 -mx-4 px-4 rounded-lg" : ""}`}>
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 mt-0.5 ${accent ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-400 leading-none mb-1">{label}</p>
        <p className={`text-sm font-semibold truncate ${accent ? "text-blue-700" : "text-slate-800"}`}>{value}</p>
      </div>
    </div>
  );
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function StepIndicator({ current }: { current: number }) {
  return (
    <div className="mb-8">
      {/* Mobile: progress bar */}
      <div className="flex sm:hidden flex-col gap-2 px-1">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-xs font-semibold text-blue-600">
            Étape {current}/{STEPS.length} — {STEPS.find((s) => s.n === current)?.label}
          </span>
          <span className="text-xs text-slate-400">
            {Math.round(((current - 1) / (STEPS.length - 1)) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
            style={{ width: `${((current - 1) / (STEPS.length - 1)) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-1">
          {STEPS.map(({ n, label }) => (
            <span
              key={n}
              className={`text-[10px] font-medium transition-colors ${n < current ? "text-blue-400" : n === current ? "text-blue-600" : "text-slate-300"
                }`}
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      {/* Desktop: dot stepper */}
      <div className="hidden sm:flex items-center justify-center">
        {STEPS.map(({ n, label }, i) => {
          const done = n < current;
          const active = n === current;
          return (
            <div key={n} className="flex items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${done
                    ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                    : active
                      ? "bg-white text-blue-600 border-2 border-blue-600 shadow-md shadow-blue-100"
                      : "bg-slate-100 text-slate-400"
                    }`}
                >
                  {done ? <CheckCircle2 className="h-4 w-4" /> : n}
                </div>
                <span
                  className={`text-[10px] font-medium whitespace-nowrap ${active ? "text-blue-600" : done ? "text-slate-500" : "text-slate-300"
                    }`}
                >
                  {label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className={`w-16 h-px mx-2 mb-5 transition-all duration-500 ${n < current ? "bg-blue-400" : "bg-slate-200"
                    }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Header ───────────────────────────────────────────────────────────────────
function Header() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 shadow-md shadow-blue-200">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 leading-none">TransportPro</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5 font-medium tracking-wide">GESTION DE FLOTTE</p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-1">
          {["Tableau de bord", "Réservations", "Flotte", "Clients"].map((item, i) => (
            <button
              key={item}
              className={`text-sm px-4 py-2 rounded-lg transition-colors ${i === 1
                ? "bg-blue-50 text-blue-700 font-medium"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                }`}
            >
              {item}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-800 text-white text-xs font-bold">
            AD
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-semibold text-slate-900 leading-none">Admin</p>
            <p className="text-[10px] text-slate-400 leading-none mt-0.5">Dispatcher</p>
          </div>
        </div>
      </div>
    </header>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-slate-100 bg-white mt-20">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700">
                <Truck className="h-4 w-4 text-white" />
              </div>
              <span className="font-bold text-slate-900">TransportPro</span>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Plateforme de gestion logistique pour professionnels du transport en Île-de-France.
            </p>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Contact</p>
            <ul className="space-y-3">
              {[
                { icon: Phone, text: "+33 1 23 45 67 89" },
                { icon: Mail, text: "dispatch@transportpro.fr" },
                { icon: Navigation, text: "Gennevilliers, 92230" },
              ].map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-center gap-2.5 text-sm text-slate-500">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-50">
                    <Icon className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  {text}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-4">Liens</p>
            <ul className="space-y-2">
              {["Mentions légales", "CGU", "Politique de confidentialité", "Support"].map((link) => (
                <li key={link}>
                  <button className="text-sm text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1 group">
                    {link}
                    <ChevronRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-slate-400">© 2026 TransportPro. Tous droits réservés.</p>
          <div className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-xs text-slate-400">Système opérationnel</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function ReservationPage() {
  const [step, setStep] = useState<Step>(1);
  const [step1Data, setStep1Data] = useState<Step1Data | null>(null);
  const [dispoResponse, setDispoResponse] = useState<DispoResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCheckingDispo, setIsCheckingDispo] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  // Scroll to card top on step change
  const goToStep = useCallback((s: Step) => {
    setStep(s);
    setTimeout(() => window.scrollTo({ top: 180, behavior: "smooth" }), 50);
  }, []);

  // ── Step 1 form ──────────────────────────────────────────────────────────────
  const form1 = useForm({
    defaultValues: {
      client_nom: "Eiffage",
      type_camion: "Frigo" as Step1Data["type_camion"],
      date: "2026-06-22",
      heure_depart: "10:00",
      adresse_depart: "Port de Gennevilliers, Gennevilliers 92230",
      adresse_arrivee: "Place de la Mairie, Clichy 92110",
    },
    validators: makeFormValidator(step1Schema),
    onSubmit: async ({ value }) => {
      setIsCheckingDispo(true);
      setErrorMessage("");
      try {
        const res = await fetch("/api/agenda/dispo-complexe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(value),
        });
        if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
        const data: DispoResponse = await res.json();
        setStep1Data(value);
        setDispoResponse(data);
        goToStep(2);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Une erreur est survenue");
        goToStep("error");
      } finally {
        setIsCheckingDispo(false);
      }
    },
  });

  // ── Step 3 form ──────────────────────────────────────────────────────────────
  const form3 = useForm({
    defaultValues: { client_email: "", client_telephone: "" },
    validators: makeFormValidator(step3Schema),
    onSubmit: async ({ value }) => {
      if (!step1Data) return;
      setIsFinalizing(true);
      try {
        const res = await fetch("/api/finalize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...step1Data, ...value }),
        });
        if (!res.ok) throw new Error(`Erreur serveur : ${res.status}`);
        goToStep(4);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Erreur lors de la finalisation");
        goToStep("error");
      } finally {
        setIsFinalizing(false);
      }
    },
  });

  const reset = () => {
    form1.reset();
    form3.reset();
    setStep(1);
    setStep1Data(null);
    setDispoResponse(null);
    setErrorMessage("");
  };

  // ── Step 4 — Success ─────────────────────────────────────────────────────────
  // ── Unified layout ───────────────────────────────────────────────────────────
  const currentStepNum = typeof step === "number" ? step : step === "error" ? 1 : 4;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Header />

      <main className="flex-1 pt-28 pb-16 px-4">
        {/* Hero */}
        <div className="mx-auto max-w-2xl mb-8 text-center">
          <Badge className="mb-4 bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-50">
            Nouvelle demande
          </Badge>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">
            Réservation de transport
          </h1>
          <p className="text-slate-500 text-sm">
            Renseignez les détails de votre mission. La disponibilité est vérifiée en temps réel.
          </p>
        </div>

        {/* Stepper — always visible */}
        <div className="mx-auto max-w-2xl">
          <StepIndicator current={currentStepNum} />

          {/* Card */}
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400" />

            {/* ════════════ STEP 1 — Mission ════════════ */}
            {step === 1 && (
              <div className="p-8">
                <form onSubmit={(e) => { e.preventDefault(); form1.handleSubmit(); }}>
                  <SectionLabel icon={User} label="Informations client" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <form1.Field name="client_nom" validators={makeFieldValidator(step1Schema.shape.client_nom)}>
                      {(field) => (
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Nom du client</Label>
                          <div className="relative">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              placeholder="Ex : Eiffage"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              className="pl-9 h-10 border-slate-200 focus:border-blue-400"
                            />
                          </div>
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form1.Field>

                    <form1.Field name="type_camion" validators={makeFieldValidator(step1Schema.shape.type_camion)}>
                      {(field) => (
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Type de camion</Label>
                          <div className="relative">
                            <Truck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 z-10 pointer-events-none" />
                            <Select value={field.state.value} onValueChange={(v) => field.handleChange(v as Step1Data["type_camion"])}>
                              <SelectTrigger className="pl-9 h-10 border-slate-200">
                                <SelectValue placeholder="Sélectionner…" />
                              </SelectTrigger>
                              <SelectContent>
                                {(["Frigo", "Benne", "Plateau", "Citerne", "Fourgon"] as const).map((t) => (
                                  <SelectItem key={t} value={t}>
                                    <span className="flex items-center gap-2">{TRUCK_ICONS[t]} {t}</span>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form1.Field>
                  </div>

                  <SectionLabel icon={Calendar} label="Date & horaire" />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <form1.Field name="date" validators={makeFieldValidator(step1Schema.shape.date)}>
                      {(field) => (
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Date de la mission</Label>
                          <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                            <Input type="date" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className="pl-9 h-10 border-slate-200" />
                          </div>
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form1.Field>

                    <form1.Field name="heure_depart" validators={makeFieldValidator(step1Schema.shape.heure_depart)}>
                      {(field) => (
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">Heure de départ</Label>
                          <div className="relative">
                            <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none z-10" />
                            <Input type="time" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className="pl-9 h-10 border-slate-200" />
                          </div>
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form1.Field>
                  </div>

                  <SectionLabel icon={MapPin} label="Itinéraire" />
                  <div className="relative space-y-4">
                    <div className="absolute left-[10px] top-12 bottom-12 w-px border-l-2 border-dashed border-slate-200 z-0" />

                    <form1.Field name="adresse_depart" validators={makeFieldValidator(step1Schema.shape.adresse_depart)}>
                      {(field) => (
                        <div className="relative z-10">
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-white text-[10px] font-bold shrink-0">A</span>
                            Adresse de départ
                          </Label>
                          <Input placeholder="Ex : Port de Gennevilliers, 92230" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className="h-10 border-slate-200" />
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form1.Field>

                    <form1.Field name="adresse_arrivee" validators={makeFieldValidator(step1Schema.shape.adresse_arrivee)}>
                      {(field) => (
                        <div className="relative z-10">
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-white text-[10px] font-bold shrink-0">B</span>
                            Adresse d&apos;arrivée
                          </Label>
                          <Input placeholder="Ex : Place de la Mairie, Clichy 92110" value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} onBlur={field.handleBlur} className="h-10 border-slate-200" />
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form1.Field>
                  </div>

                  <div className="pt-8">
                    <form1.Subscribe selector={(s) => s.canSubmit}>
                      {(canSubmit) => (
                        <Button type="submit" className="w-full h-11 bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 font-medium" disabled={!canSubmit || isCheckingDispo}>
                          {isCheckingDispo ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Vérification en cours…</>
                          ) : (
                            <>Vérifier la disponibilité <ArrowRight className="h-4 w-4" /></>
                          )}
                        </Button>
                      )}
                    </form1.Subscribe>
                    <p className="text-center text-xs text-slate-400 mt-3">Vérification instantanée · Sans engagement</p>
                  </div>
                </form>
              </div>
            )}

            {/* ════════════ STEP 2 — Récapitulatif devis ════════════ */}
            {step === 2 && step1Data && (
              <div className="p-8">
                {/* Available banner */}
                <div className="flex items-center gap-3 mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 shrink-0">
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">Créneau disponible ✓</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {dispoResponse?.message ?? "La disponibilité a été confirmée pour ce créneau"}
                    </p>
                  </div>
                </div>

                <SectionLabel icon={FileSignature} label="Détails de la mission" />

                <div className="space-y-0">
                  <RecapItem icon={User} label="Client" value={step1Data.client_nom} />
                  <RecapItem
                    icon={Truck}
                    label="Type de véhicule"
                    value={`${TRUCK_ICONS[dispoResponse?.devis_valide?.type_camion ?? step1Data.type_camion]} ${dispoResponse?.devis_valide?.type_camion ?? step1Data.type_camion}`}
                  />
                  <RecapItem
                    icon={Calendar}
                    label="Date & heure de départ"
                    value={`${dispoResponse?.devis_valide?.date ?? step1Data.date} à ${dispoResponse?.devis_valide?.heure_depart ?? step1Data.heure_depart}`}
                  />
                  <RecapItem icon={MapPin} label="Adresse de départ" value={step1Data.adresse_depart} />
                  <RecapItem icon={Navigation} label="Adresse d'arrivée" value={step1Data.adresse_arrivee} />
                  {dispoResponse?.devis_valide?.distance_total_estimée_km && (
                    <RecapItem
                      icon={Ruler}
                      label="Distance estimée"
                      value={`${dispoResponse.devis_valide.distance_total_estimée_km} km`}
                    />
                  )}
                </div>

                {dispoResponse?.paiement?.montant_euros && (
                  <>
                    <Separator className="my-4" />
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                          <Euro className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-xs text-blue-500 font-medium">Montant total estimé</p>
                          <p className="text-xs text-blue-400">TVA incluse</p>
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-blue-700">
                        {dispoResponse.paiement.montant_euros} <span className="text-base font-semibold">€</span>
                      </p>
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-8">
                  <Button variant="outline" onClick={() => goToStep(1)} className="flex-1 h-11 rounded-xl gap-2">
                    <ArrowLeft className="h-4 w-4" /> Modifier
                  </Button>
                  <Button onClick={() => goToStep(3)} className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 font-medium">
                    Continuer <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* ════════════ STEP 3 — Contact client ════════════ */}
            {step === 3 && (
              <div className="p-8">
                <div className="mb-6">
                  <h2 className="text-base font-semibold text-slate-900 mb-1">Coordonnées du client</h2>
                  <p className="text-sm text-slate-500">
                    Le contrat électronique sera envoyé à ces coordonnées pour signature.
                  </p>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); form3.handleSubmit(); }}>
                  <SectionLabel icon={Send} label="Envoi du contrat" />

                  <div className="space-y-5">
                    <form3.Field name="client_email" validators={makeFieldValidator(step3Schema.shape.client_email)}>
                      {(field) => (
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            Adresse e-mail <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              type="email"
                              placeholder="client@entreprise.fr"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              className="pl-9 h-11 border-slate-200 focus:border-blue-400"
                            />
                          </div>
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form3.Field>

                    <form3.Field name="client_telephone" validators={makeFieldValidator(step3Schema.shape.client_telephone)}>
                      {(field) => (
                        <div>
                          <Label className="text-sm font-medium text-slate-700 mb-1.5 block">
                            Téléphone <span className="text-red-400">*</span>
                          </Label>
                          <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                              type="tel"
                              placeholder="06 12 34 56 78"
                              value={field.state.value}
                              onChange={(e) => field.handleChange(e.target.value)}
                              onBlur={field.handleBlur}
                              className="pl-9 h-11 border-slate-200 focus:border-blue-400"
                            />
                          </div>
                          <FieldError errors={field.state.meta.errors.map(String)} />
                        </div>
                      )}
                    </form3.Field>
                  </div>

                  {/* Mini recap */}
                  <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Récapitulatif mission</p>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Client</span>
                        <span className="font-medium text-slate-700">{step1Data?.client_nom}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Camion</span>
                        <span className="font-medium text-slate-700">{TRUCK_ICONS[step1Data?.type_camion ?? ""]} {step1Data?.type_camion}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Date</span>
                        <span className="font-medium text-slate-700">{step1Data?.date} · {step1Data?.heure_depart}</span>
                      </div>
                      {dispoResponse?.paiement?.montant_euros && (
                        <div className="flex justify-between pt-2 border-t border-slate-200 mt-1">
                          <span className="text-slate-500 font-semibold">Total</span>
                          <span className="font-bold text-blue-700">{dispoResponse.paiement.montant_euros} €</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3 pt-8">
                    <Button type="button" variant="outline" onClick={() => goToStep(2)} className="flex-1 h-11 rounded-xl gap-2">
                      <ArrowLeft className="h-4 w-4" /> Retour
                    </Button>
                    <form3.Subscribe selector={(s) => s.canSubmit}>
                      {(canSubmit) => (
                        <Button type="submit" className="flex-1 h-11 bg-blue-600 hover:bg-blue-700 rounded-xl gap-2 font-medium" disabled={!canSubmit || isFinalizing}>
                          {isFinalizing ? (
                            <><Loader2 className="h-4 w-4 animate-spin" /> Envoi…</>
                          ) : (
                            <><FileSignature className="h-4 w-4" /> Envoyer le contrat</>
                          )}
                        </Button>
                      )}
                    </form3.Subscribe>
                  </div>

                  <p className="text-center text-xs text-slate-400 mt-3">
                    En continuant, vous acceptez l&apos;envoi d&apos;un contrat électronique signable en ligne.
                  </p>
                </form>
              </div>
            )}

            {/* ════════════ STEP 4 — Succès ════════════ */}
            {step === 4 && (
              <div className="p-8 text-center">
                <div className="mx-auto mb-6 relative w-fit">
                  <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-full bg-green-100">
                    <CheckCircle2 className="h-10 w-10 text-green-600" />
                  </div>
                  <div className="absolute -right-1 -top-1 h-5 w-5 rounded-full bg-green-400 animate-ping opacity-30" />
                </div>
                <Badge className="mb-4 bg-green-50 text-green-700 border-green-200">Mission confirmée</Badge>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Contrat envoyé !</h2>
                <p className="text-slate-500 text-sm leading-relaxed mb-8">
                  Le contrat électronique a été transmis à{" "}
                  <span className="font-semibold text-slate-700">{step1Data?.client_nom}</span>.{" "}
                  Le client recevra une notification pour signature.
                </p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-8 text-left">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400 mb-3">Résumé</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Client</span>
                      <span className="font-medium text-slate-800">{step1Data?.client_nom}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Transport</span>
                      <span className="font-medium text-slate-800">{TRUCK_ICONS[step1Data?.type_camion ?? ""]} {step1Data?.type_camion}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Date</span>
                      <span className="font-medium text-slate-800">{step1Data?.date} à {step1Data?.heure_depart}</span>
                    </div>
                    {dispoResponse?.paiement?.montant_euros && (
                      <div className="flex justify-between pt-2 border-t border-slate-100 mt-1">
                        <span className="text-slate-500 font-semibold">Total</span>
                        <span className="font-bold text-blue-700">{dispoResponse.paiement.montant_euros} €</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button onClick={reset} className="gap-2 bg-blue-600 hover:bg-blue-700 h-11 px-8 rounded-xl">
                  <ArrowRight className="h-4 w-4" />
                  Nouvelle réservation
                </Button>
              </div>
            )}

            {/* ════════════ ERROR ════════════ */}
            {step === "error" && (
              <div className="p-8 text-center">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                  <AlertCircle className="h-10 w-10 text-red-500" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Une erreur est survenue</h2>
                <p className="text-slate-500 text-sm mb-8">{errorMessage}</p>
                <Button onClick={reset} variant="outline" className="rounded-xl">Réessayer</Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}