import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customName = formData.get("fileName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const finalName = customName || `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    const contentType = file.type || "application/octet-stream";

    const url = await uploadToR2(buffer, finalName, contentType);

    return NextResponse.json({
      success: true,
      url,
      fileName: finalName,
      size: buffer.length,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("Cloudflare R2 Upload Error:", errorMsg);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
