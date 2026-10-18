import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { d1Query, isD1Configured } from "@/lib/d1";
import { store } from "@/lib/data-store";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.redirect(new URL("/default-candidate-poster.jpg", req.url), 307);
  }

  let posterUrl: string | null = null;

  // 1. Try Cloudflare D1
  if (isD1Configured()) {
    try {
      const rows = await d1Query<{ posterUrl: string }>(
        `SELECT posterUrl FROM "Candidate" WHERE id = ? OR (id = 'cand_1' AND ? = 'cmuq2l4zx0002jz04vr6hy570') LIMIT 1`,
        [id, id]
      );
      if (rows.length > 0 && rows[0].posterUrl) {
        posterUrl = rows[0].posterUrl;
      }
    } catch (e) {
      console.warn("D1 poster fetch notice:", e);
    }
  }

  // 2. Try Neon PostgreSQL
  if (!posterUrl) {
    try {
      const cand = await prisma.candidate.findUnique({
        where: { id },
        select: { posterUrl: true },
      });
      if (cand?.posterUrl) {
        posterUrl = cand.posterUrl;
      }
    } catch (e) {
      console.warn("Neon DB poster fetch notice:", e);
    }
  }

  // 3. Try In-Memory Store
  if (!posterUrl) {
    const storeCand = store.getCandidate(id);
    if (storeCand?.posterUrl) {
      posterUrl = storeCand.posterUrl;
    }
  }

  if (!posterUrl) {
    return NextResponse.redirect(new URL("/default-candidate-poster.jpg", req.url), 307);
  }

  // If already an external URL (e.g. Cloudflare R2 bucket)
  if (posterUrl.startsWith("http://") || posterUrl.startsWith("https://")) {
    return NextResponse.redirect(posterUrl, 307);
  }

  // If local static path
  if (posterUrl.startsWith("/")) {
    return NextResponse.redirect(new URL(posterUrl, req.url), 307);
  }

  // If Base64 Data URL, decode and serve as binary image with Edge CDN Cache
  if (posterUrl.startsWith("data:image/")) {
    try {
      const commaIdx = posterUrl.indexOf(",");
      if (commaIdx !== -1) {
        const meta = posterUrl.substring(0, commaIdx);
        const base64Data = posterUrl.substring(commaIdx + 1);
        const mimeMatch = meta.match(/^data:([^;]+)/);
        const mimeType = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const buffer = Buffer.from(base64Data, "base64");

        return new NextResponse(buffer, {
          status: 200,
          headers: {
            "Content-Type": mimeType,
            "Content-Length": String(buffer.length),
            // Cache in browser for 1 day, in Vercel Edge CDN for 7 days
            "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        });
      }
    } catch (parseErr) {
      console.warn("Base64 poster parse error:", parseErr);
    }
  }

  return NextResponse.redirect(new URL("/default-candidate-poster.jpg", req.url), 307);
}
