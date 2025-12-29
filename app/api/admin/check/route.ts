import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-middleware";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin(req);
    return NextResponse.json({ authorized: true });
  } catch (error: any) {
    return NextResponse.json(
      { authorized: false, error: error.message },
      { status: 403 }
    );
  }
}

