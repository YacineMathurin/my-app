import { NextResponse } from "next/server";

type FilterValue = string | number | boolean;

interface SearchRequestBody {
  tableName: string;
  filters: Record<string, FilterValue>;
}

function isFilterValue(value: unknown): value is FilterValue {
  return (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}

function isSearchRequestBody(body: unknown): body is SearchRequestBody {
  if (!body || typeof body !== "object") return false;

  const { tableName, filters } = body as Record<string, unknown>;

  if (typeof tableName !== "string" || !tableName.trim()) return false;
  if (!filters || typeof filters !== "object" || Array.isArray(filters))
    return false;

  return Object.values(filters).every(isFilterValue);
}

function buildFilterFormula(filters: Record<string, FilterValue>): string {
  const conditions = Object.entries(filters).map(([column, value]) => {
    if (typeof value === "boolean") {
      return `{${column}} = ${value ? "TRUE()" : "FALSE()"}`;
    }
    if (typeof value === "number") {
      return `{${column}} = ${value}`;
    }
    return `{${column}} = '${value.replace(/'/g, "\\'")}'`;
  });

  return conditions.length === 1
    ? conditions[0]
    : `AND(${conditions.join(", ")})`;
}

/**
 * 
 * @param request 
 * @returns 
 * 
 * Vapi should send a POST request to this endpoint with a JSON body structured like this:
 * {
        "tableName": "Clients",
        "filters": {
            "Telephone": "+33612345678",
            "ContratActif": true,
            "MontantDu": 0
        }
   }
 */

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body: unknown = await request.json();

    if (!isSearchRequestBody(body)) {
      return NextResponse.json(
        {
          error:
            "Corps de requête invalide : tableName (string) et filters (objet de valeurs primitives) requis",
        },
        { status: 400 },
      );
    }

    const { tableName, filters } = body;

    if (Object.keys(filters).length === 0) {
      return NextResponse.json(
        { error: "Au moins un filtre est requis" },
        { status: 400 },
      );
    }

    const AIRTABLE_PAT = process.env.AIRTABLE_PERSONAL_ACCESS_TOKEN;
    const BASE_ID = process.env.AIRTABLE_BASE_ID;

    if (!AIRTABLE_PAT || !BASE_ID) {
      return NextResponse.json(
        { error: "Configuration Airtable manquante" },
        { status: 500 },
      );
    }

    const filterByFormula = buildFilterFormula(filters);
    const airtableUrl = `https://api.airtable.com/v0/${BASE_ID}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(filterByFormula)}&maxRecords=1`;

    const response = await fetch(airtableUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorData: unknown = await response.json();
      console.error("Erreur Airtable:", errorData);
      return NextResponse.json(
        { error: "Erreur lors de la recherche Airtable" },
        { status: 500 },
      );
    }

    const data: unknown = await response.json();

    if (
      data &&
      typeof data === "object" &&
      "records" in data &&
      Array.isArray(data.records) &&
      data.records.length > 0
    ) {
      const record: unknown = data.records[0];

      if (
        record &&
        typeof record === "object" &&
        "id" in record &&
        "fields" in record &&
        typeof record.id === "string"
      ) {
        return NextResponse.json(
          { found: true, id: record.id, fields: record.fields },
          { status: 200 },
        );
      }
    }

    return NextResponse.json(
      { found: false, message: "Aucun enregistrement trouvé" },
      { status: 200 },
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Erreur inconnue";
    console.error("Erreur Route API Search:", message);
    return NextResponse.json(
      { error: "Erreur serveur interne" },
      { status: 500 },
    );
  }
}
