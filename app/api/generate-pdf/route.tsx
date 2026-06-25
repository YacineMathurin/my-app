import { NextResponse } from "next/server";
import { renderToStream } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const pdfStyles = StyleSheet.create({
  page: { padding: 40 },
  header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  section: { margin: 10, padding: 10, border: '1px solid black' }
});

const MyDocument = () => (
  <Document>
    <Page size="A4" style={pdfStyles.page}>
      <Text style={pdfStyles.header}>Ordre de Transport</Text>
      <View style={pdfStyles.section}>
        <Text>Document généré pour Yacine.</Text>
      </View>
    </Page>
  </Document>
);

export async function GET() {
  const stream = await renderToStream(<MyDocument />);

  const chunks: Uint8Array[] = [];
  for await (const chunk of stream as AsyncIterable<Uint8Array>) {
    chunks.push(chunk);
  }
  const pdfBuffer = Buffer.concat(chunks);

  return new NextResponse(pdfBuffer, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'inline; filename="document.pdf"',
    },
  });
}