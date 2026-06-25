import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Line,
  Svg,
} from "@react-pdf/renderer";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  navy: "#1A2433",
  amber: "#F5A623",
  bg: "#F7F9FC",
  line: "#D6DCE4",
  muted: "#6B7A90",
  white: "#FFFFFF",
  rowAlt: "#EEF1F6",
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: C.bg,
    fontFamily: "Helvetica",
    fontSize: 9,
    color: C.navy,
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
  },

  // ── Header band ──────────────────────────────────────────────────────────
  headerBand: {
    backgroundColor: C.navy,
    paddingHorizontal: 40,
    paddingTop: 28,
    paddingBottom: 22,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  companyName: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: C.white,
    letterSpacing: 1.5,
  },
  companyTagline: {
    fontSize: 8,
    color: C.amber,
    letterSpacing: 2,
    marginTop: 3,
    textTransform: "uppercase",
  },
  companyMeta: { fontSize: 8, color: "#8FA3BC", marginTop: 2 },

  // ── Amber accent bar under header ────────────────────────────────────────
  accentBar: {
    backgroundColor: C.amber,
    height: 4,
  },

  // ── OT Number watermark strip ────────────────────────────────────────────
  otStrip: {
    backgroundColor: C.white,
    paddingHorizontal: 40,
    paddingTop: 18,
    paddingBottom: 18,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  otLabel: {
    fontSize: 7,
    color: C.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  otNumber: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    color: C.navy,
    letterSpacing: -0.5,
  },
  otMeta: { fontSize: 8, color: C.muted, textAlign: "right" },
  otMetaVal: { fontSize: 8, color: C.navy, fontFamily: "Helvetica-Bold" },

  // ── Body content ─────────────────────────────────────────────────────────
  body: { paddingHorizontal: 40, paddingTop: 22 },

  // ── Info blocks ──────────────────────────────────────────────────────────
  infoRow: { flexDirection: "row", gap: 14, marginBottom: 20 },
  infoBox: {
    flex: 1,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 12,
  },
  infoBoxTitle: {
    fontSize: 7,
    color: C.amber,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 7,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
    paddingBottom: 5,
  },
  infoLine: { fontSize: 9, color: C.navy, marginBottom: 3 },
  infoLineMuted: { fontSize: 8, color: C.muted, marginBottom: 2 },

  // ── Route strip ──────────────────────────────────────────────────────────
  routeStrip: {
    backgroundColor: C.navy,
    borderRadius: 4,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  routePoint: { flex: 1 },
  routeLabel: {
    fontSize: 7,
    color: C.amber,
    letterSpacing: 1.5,
    fontFamily: "Helvetica-Bold",
    textTransform: "uppercase",
    marginBottom: 3,
  },
  routeCity: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: C.white,
  },
  routeAddress: { fontSize: 8, color: "#8FA3BC", marginTop: 2 },
  routeArrow: { paddingHorizontal: 12, alignItems: "center" },

  // ── Table ─────────────────────────────────────────────────────────────────
  tableTitle: {
    fontSize: 7,
    color: C.muted,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  table: {
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 20,
  },
  tableHead: {
    backgroundColor: C.navy,
    flexDirection: "row",
  },
  tableHeadCell: {
    padding: 8,
    fontSize: 7,
    color: C.amber,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  tableRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: C.line,
  },
  tableRowAlt: { backgroundColor: C.rowAlt },
  tableCell: { padding: 8, fontSize: 9, color: C.navy },
  colRef: { width: "14%" },
  colDesc: { flex: 1 },
  colQty: { width: "8%", textAlign: "right" },
  colUnit: { width: "12%", textAlign: "right" },
  colPU: { width: "14%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },

  // ── Totals ───────────────────────────────────────────────────────────────
  totalsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  totalsBox: {
    width: 200,
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    overflow: "hidden",
  },
  totalLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: C.line,
  },
  totalLineLabel: { fontSize: 8, color: C.muted },
  totalLineValue: { fontSize: 8, color: C.navy },
  totalTTCLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: C.navy,
  },
  totalTTCLabel: {
    fontSize: 8,
    color: C.amber,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1,
  },
  totalTTCValue: {
    fontSize: 11,
    color: C.white,
    fontFamily: "Helvetica-Bold",
  },

  // ── Instructions ─────────────────────────────────────────────────────────
  instructionsBox: {
    backgroundColor: C.white,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 12,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 7,
    color: C.amber,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  instructionsText: { fontSize: 8.5, color: C.navy, lineHeight: 1.5 },

  // ── Signatures ────────────────────────────────────────────────────────────
  sigRow: { flexDirection: "row", gap: 20 },
  sigBox: {
    flex: 1,
    borderWidth: 1,
    borderColor: C.line,
    borderRadius: 4,
    padding: 12,
    backgroundColor: C.white,
  },
  sigLabel: {
    fontSize: 7,
    color: C.muted,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  sigName: { fontSize: 9, color: C.navy, fontFamily: "Helvetica-Bold" },
  sigSpace: { height: 44 },
  sigLine: { height: 1, backgroundColor: C.line, marginTop: 4 },
  sigDate: { fontSize: 7, color: C.muted, marginTop: 4, textAlign: "right" },

  // ── Footer ────────────────────────────────────────────────────────────────
  footer: {
    position: "absolute",
    bottom: 20,
    left: 40,
    right: 40,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: C.line,
    paddingTop: 8,
  },
  footerText: { fontSize: 7, color: C.muted },
  footerPage: {
    fontSize: 7,
    color: C.muted,
    fontFamily: "Helvetica-Bold",
  },
});

// ─── Data (swap for real props/DB) ────────────────────────────────────────────
const OT_NUMBER = "OT-2024-00847";
const DATE_EMISSION = new Date().toLocaleDateString("fr-FR");
const DATE_LIVRAISON = "28/06/2024";

const transporter = {
  name: "TRANSPORTS YACINE",
  tagline: "Solutions logistiques sur mesure",
  address: "12 Rue du Transport",
  city: "92600 Asnières-sur-Seine",
  siret: "123 456 789 00012",
  tel: "+33 1 47 91 23 45",
  email: "contact@transports-yacine.fr",
};

const client = {
  name: "SARL Exemple Logistique",
  contact: "M. Jean Dupont",
  address: "15 Avenue de la Gare",
  city: "75000 Paris",
  tel: "+33 1 23 45 67 89",
};

const route = {
  from: { city: "Asnières-sur-Seine", address: "12 Rue du Transport, 92600" },
  to: { city: "Paris 15e", address: "38 Rue Lecourbe, 75015" },
};

const lines = [
  { ref: "TRP-001", desc: "Transport marchandises générales — véhicule 19T", qty: 1, unit: "voyage", pu: 450.00 },
  { ref: "TRP-002", desc: "Manutention chargement / déchargement", qty: 2, unit: "heure", pu: 55.00 },
  { ref: "TRP-003", desc: "Péages autoroute (forfait)", qty: 1, unit: "forfait", pu: 18.50 },
];

const TVA = 0.20;
const totalHT = lines.reduce((s, l) => s + l.qty * l.pu, 0);
const totalTVA = totalHT * TVA;
const totalTTC = totalHT + totalTVA;
const fmt = (n: number) =>
  n.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " €";

// ─── PDF Component ────────────────────────────────────────────────────────────
const OTDocument = () => (
  <Document
    title={`Ordre de Transport ${OT_NUMBER}`}
    author={transporter.name}
    subject="Ordre de Transport"
  >
    <Page size="A4" style={styles.page}>

      {/* ── Header band ── */}
      <View style={styles.headerBand}>
        <View>
          <Text style={styles.companyName}>{transporter.name}</Text>
          <Text style={styles.companyTagline}>{transporter.tagline}</Text>
          <Text style={styles.companyMeta}>{transporter.address} · {transporter.city}</Text>
          <Text style={styles.companyMeta}>SIRET {transporter.siret} · {transporter.tel}</Text>
        </View>
        <View style={{ alignItems: "flex-end" }}>
          <Text style={{ fontSize: 7, color: "#8FA3BC", marginBottom: 3 }}>DOCUMENT OFFICIEL</Text>
          <View style={{ backgroundColor: C.amber, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
            <Text style={{ fontSize: 7, fontFamily: "Helvetica-Bold", color: C.navy, letterSpacing: 1 }}>
              ORDRE DE TRANSPORT
            </Text>
          </View>
        </View>
      </View>

      {/* ── Amber accent line ── */}
      <View style={styles.accentBar} />

      {/* ── OT reference strip ── */}
      <View style={styles.otStrip}>
        <View>
          <Text style={styles.otLabel}>Référence document</Text>
          <Text style={styles.otNumber}>{OT_NUMBER}</Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 3 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 30 }}>
            <Text style={styles.otMeta}>Date d&apos;émission</Text>
            <Text style={styles.otMetaVal}>{DATE_EMISSION}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 30 }}>
            <Text style={styles.otMeta}>Date de livraison</Text>
            <Text style={styles.otMetaVal}>{DATE_LIVRAISON}</Text>
          </View>
          <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 30 }}>
            <Text style={styles.otMeta}>Statut</Text>
            <Text style={{ fontSize: 8, color: "#2E7D32", fontFamily: "Helvetica-Bold" }}>● CONFIRMÉ</Text>
          </View>
        </View>
      </View>

      {/* ── Body ── */}
      <View style={styles.body}>

        {/* ── Transporteur + Client ── */}
        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Transporteur</Text>
            <Text style={[styles.infoLine, { fontFamily: "Helvetica-Bold" }]}>{transporter.name}</Text>
            <Text style={styles.infoLineMuted}>{transporter.address}</Text>
            <Text style={styles.infoLineMuted}>{transporter.city}</Text>
            <Text style={[styles.infoLineMuted, { marginTop: 4 }]}>SIRET : {transporter.siret}</Text>
            <Text style={styles.infoLineMuted}>Tél : {transporter.tel}</Text>
            <Text style={styles.infoLineMuted}>{transporter.email}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoBoxTitle}>Donneur d&apos;ordre</Text>
            <Text style={[styles.infoLine, { fontFamily: "Helvetica-Bold" }]}>{client.name}</Text>
            <Text style={styles.infoLineMuted}>Contact : {client.contact}</Text>
            <Text style={styles.infoLineMuted}>{client.address}</Text>
            <Text style={styles.infoLineMuted}>{client.city}</Text>
            <Text style={[styles.infoLineMuted, { marginTop: 4 }]}>Tél : {client.tel}</Text>
          </View>
        </View>

        {/* ── Route strip ── */}
        <View style={styles.routeStrip}>
          <View style={styles.routePoint}>
            <Text style={styles.routeLabel}>Enlèvement</Text>
            <Text style={styles.routeCity}>{route.from.city}</Text>
            <Text style={styles.routeAddress}>{route.from.address}</Text>
          </View>
          <View style={styles.routeArrow}>
            <Svg width="40" height="12" viewBox="0 0 40 12">
              <Line x1="0" y1="6" x2="32" y2="6" stroke={C.amber} strokeWidth="1.5" />
              <Line x1="28" y1="2" x2="36" y2="6" stroke={C.amber} strokeWidth="1.5" />
              <Line x1="28" y1="10" x2="36" y2="6" stroke={C.amber} strokeWidth="1.5" />
            </Svg>
          </View>
          <View style={[styles.routePoint, { alignItems: "flex-end" }]}>
            <Text style={styles.routeLabel}>Livraison</Text>
            <Text style={styles.routeCity}>{route.to.city}</Text>
            <Text style={styles.routeAddress}>{route.to.address}</Text>
          </View>
        </View>

        {/* ── Prestations table ── */}
        <Text style={styles.tableTitle}>Détail des prestations</Text>
        <View style={styles.table}>
          <View style={styles.tableHead}>
            <Text style={[styles.tableHeadCell, styles.colRef]}>Réf.</Text>
            <Text style={[styles.tableHeadCell, styles.colDesc]}>Désignation</Text>
            <Text style={[styles.tableHeadCell, styles.colQty]}>Qté</Text>
            <Text style={[styles.tableHeadCell, styles.colUnit]}>Unité</Text>
            <Text style={[styles.tableHeadCell, styles.colPU]}>P.U. HT</Text>
            <Text style={[styles.tableHeadCell, styles.colTotal]}>Total HT</Text>
          </View>
          {lines.map((l, i) => (
            <View key={i} style={[styles.tableRow, ...(i % 2 === 1 ? [styles.tableRowAlt] : [])]}>
              <Text style={[styles.tableCell, styles.colRef, { color: C.muted }]}>{l.ref}</Text>
              <Text style={[styles.tableCell, styles.colDesc]}>{l.desc}</Text>
              <Text style={[styles.tableCell, styles.colQty]}>{l.qty}</Text>
              <Text style={[styles.tableCell, styles.colUnit, { color: C.muted }]}>{l.unit}</Text>
              <Text style={[styles.tableCell, styles.colPU]}>{fmt(l.pu)}</Text>
              <Text style={[styles.tableCell, styles.colTotal, { fontFamily: "Helvetica-Bold" }]}>
                {fmt(l.qty * l.pu)}
              </Text>
            </View>
          ))}
        </View>

        {/* ── Totals ── */}
        <View style={styles.totalsRow}>
          <View style={styles.totalsBox}>
            <View style={styles.totalLine}>
              <Text style={styles.totalLineLabel}>Total HT</Text>
              <Text style={styles.totalLineValue}>{fmt(totalHT)}</Text>
            </View>
            <View style={styles.totalLine}>
              <Text style={styles.totalLineLabel}>TVA 20 %</Text>
              <Text style={styles.totalLineValue}>{fmt(totalTVA)}</Text>
            </View>
            <View style={styles.totalTTCLine}>
              <Text style={styles.totalTTCLabel}>TOTAL TTC</Text>
              <Text style={styles.totalTTCValue}>{fmt(totalTTC)}</Text>
            </View>
          </View>
        </View>

        {/* ── Instructions + Signatures — kept together, pushed to next page if split ── */}
        <View wrap={false}>
          <View style={styles.instructionsBox}>
            <Text style={styles.instructionsTitle}>Instructions de transport</Text>
            <Text style={styles.instructionsText}>
              Marchandises générales — pas de matières dangereuses. Livraison en rez-de-chaussée, hayon
              obligatoire. Contacter le destinataire 1h avant l&apos;arrivée. Documents de livraison à faire
              signer par le réceptionnaire et à retourner à l&apos;expéditeur dans les 48h.
            </Text>
          </View>

          {/* ── Signatures ── */}
          <View style={styles.sigRow}>
            <View style={styles.sigBox}>
              <Text style={styles.sigLabel}>Signature transporteur</Text>
              <Text style={styles.sigName}>{transporter.name}</Text>
              <View style={styles.sigSpace} />
              <View style={styles.sigLine} />
              <Text style={styles.sigDate}>Date : _____ / _____ / __________</Text>
            </View>
            <View style={styles.sigBox}>
              <Text style={styles.sigLabel}>Signature & cachet client</Text>
              <Text style={styles.sigName}>{client.name}</Text>
              <View style={styles.sigSpace} />
              <View style={styles.sigLine} />
              <Text style={styles.sigDate}>Date : _____ / _____ / __________</Text>
            </View>
          </View>
        </View>
      </View>

      {/* ── Footer ── */}
      <View style={styles.footer} fixed>
        <Text style={styles.footerText}>
          {transporter.name} · {transporter.address}, {transporter.city} · SIRET {transporter.siret}
        </Text>
        <Text style={styles.footerPage}>{OT_NUMBER}</Text>
      </View>
    </Page>
  </Document>
);

export async function GET() {
  const stream = await renderToStream(<OTDocument />);
  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) chunks.push(chunk);

  return new NextResponse(Buffer.concat(chunks), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${OT_NUMBER}.pdf"`,
    },
  });
}