import { NextRequest, NextResponse } from "next/server";
import { uploadToR2 } from "@/lib/r2";
import { getSessionFromRequest } from "@/lib/auth/session";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel",
  "text/csv",
]);

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

export async function POST(req: NextRequest) {
  try {
    const session = getSessionFromRequest(req);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized", message: "Authentication is required to upload files." },
        { status: 401 }
      );
    }

    if (session.role === "KARYAKARTA") {
      return NextResponse.json(
        { error: "Forbidden", message: "Field karyakartas are not permitted to upload campaign files." },
        { status: 403 }
      );
    }

    const ip = getClientIp(req);
    const userKey = session.userId || ip;
    const rateCheck = checkRateLimit(`upload_${userKey}`, { limit: 15, windowMs: 60000 });
    if (!rateCheck.success) {
      return rateLimitResponse(rateCheck.retryAfterSeconds, "Upload rate limit exceeded. (अपलोड सीमा पार हो गई।)");
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customName = formData.get("fileName") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds 15MB size limit (फ़ाइल 15MB से अधिक बड़ी है)" },
        { status: 400 }
      );
    }

    const contentType = file.type || "application/octet-stream";
    if (!ALLOWED_MIME_TYPES.has(contentType)) {
      return NextResponse.json(
        { error: `Unsupported file type (${contentType}). Only images (JPEG, PNG, WebP) and Excel/CSV files are permitted.` },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const sanitizedBase = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const finalName = customName
      ? customName.replace(/[^a-zA-Z0-9._-]/g, "_")
      : `${Date.now()}_${sanitizedBase}`;

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
