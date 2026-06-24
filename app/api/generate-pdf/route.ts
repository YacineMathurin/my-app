import { NextResponse } from "next/server";
import puppeteer from "puppeteer-core";
import chromium from "@sparticuz/chromium";

export async function GET() {
  let browser = null;

  try {
    // Détection si on est sur Vercel (production) ou en local
    const isLocal = process.env.NODE_ENV === "development";

    const executablePath = isLocal
      ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" // Chemin de Chrome sur votre PC
      : await chromium.executablePath();

    browser = await puppeteer.launch({
      args: isLocal ? [] : chromium.args,
      executablePath: executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // 2. Contenu HTML simple
    const htmlContent = `
  <html>
    <head>
      <style>
        body { font-family: sans-serif; color: #333; line-height: 1.4; padding: 20px; }
        .header { display: flex; justify-content: space-between; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; background: #000; color: #fff; padding: 10px; width: 120px; text-align: center; }
        h1 { font-size: 22px; text-transform: uppercase; margin: 0; }
        .info-grid { display: flex; justify-content: space-between; margin-bottom: 40px; }
        .box { border: 1px solid #ccc; padding: 15px; width: 45%; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 40px; }
        th { background: #f4f4f4; text-align: left; padding: 10px; border: 1px solid #ddd; }
        td { padding: 10px; border: 1px solid #ddd; }
        .signature-section { display: flex; justify-content: space-between; margin-top: 50px; }
        .signature-box { width: 40%; border-top: 1px solid #000; padding-top: 10px; text-align: center; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">LOGO</div>
        <div style="text-align: right;">
          <strong>Transports Yacine</strong><br>
          SIRET: 123 456 789<br>
          12 Avenue des Transports, 93250
        </div>
      </div>

      <h1>Ordre de Transport N° 2026-001</h1>
      
      <div class="info-grid">
        <div class="box">
          <strong>Donneur d'ordre:</strong><br>
          Client Final<br>
          Adresse du client<br>
          75000 Paris
        </div>
        <div class="box">
          <strong>Date de prestation:</strong><br>
          24 Juin 2026<br>
          <br>
          <strong>Lieu de chargement:</strong><br>
          Paris, France
        </div>
      </div>

      <table>
        <thead>
          <tr>
            <th>Désignation</th>
            <th>Qté</th>
            <th>Prix HT</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Prestation de transport (Moringa)</td>
            <td>1</td>
            <td>450.00 €</td>
          </tr>
          <tr>
            <td>Frais de dossier</td>
            <td>1</td>
            <td>25.00 €</td>
          </tr>
        </tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="text-align: right; font-weight: bold;">TOTAL HT</td>
            <td>475.00 €</td>
          </tr>
        </tfoot>
      </table>

      <div class="signature-section">
        <div class="signature-box">Signature Transporteur</div>
        <div class="signature-box">Signature Client (Bon pour accord)</div>
      </div>
    </body>
  </html>
`;

    // Dans ton API Route
    await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

    // 3. Génération du PDF
    const pdfBuffer = Buffer.from(
      await page.pdf({
        format: "A4",
        printBackground: true,
      }),
    );

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="document.pdf"',
      },
    });
  } catch (error) {
    console.error(error);
    return new NextResponse("Erreur lors de la génération", { status: 500 });
  } finally {
    if (browser !== null) await browser.close();
  }
}
