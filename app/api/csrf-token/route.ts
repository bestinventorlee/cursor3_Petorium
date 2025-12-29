import { NextRequest, NextResponse } from "next/server";
import { generateCSRFToken } from "@/lib/csrf";

export async function GET(request: NextRequest) {
  const token = await generateCSRFToken();
  
  return NextResponse.json(
    { token },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}

