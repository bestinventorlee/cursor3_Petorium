import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const metric = await request.json();

    // In production, send to your analytics service
    // Example: Google Analytics, Vercel Analytics, etc.
    console.log("Web Vital:", metric);

    // You can store in database or send to external service
    // await prisma.webVital.create({ data: metric });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error logging web vitals:", error);
    return NextResponse.json(
      { error: "Failed to log web vitals" },
      { status: 500 }
    );
  }
}

