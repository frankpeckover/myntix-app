import { NextResponse } from "next/server";
import { PublicOrganisationDirectoryService } from "@/domains/organisation/public-organisation-directory-service";

export const dynamic = "force-dynamic";

const directoryService = new PublicOrganisationDirectoryService();
const publicHeaders = {
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
};

export async function GET() {
  try {
    const organisations = await directoryService.list();

    return NextResponse.json(
      { organisations },
      { headers: publicHeaders },
    );
  } catch (error) {
    console.error("Could not load the public organisation directory.", error);
    return NextResponse.json(
      { error: "Could not load organisations." },
      {
        headers: {
          ...publicHeaders,
          "Cache-Control": "no-store",
        },
        status: 503,
      },
    );
  }
}

export function OPTIONS() {
  return new NextResponse(null, {
    headers: {
      ...publicHeaders,
      "Access-Control-Allow-Headers": "Accept, Content-Type",
      "Cache-Control": "public, max-age=86400",
    },
    status: 204,
  });
}
