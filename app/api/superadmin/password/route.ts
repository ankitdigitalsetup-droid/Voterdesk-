import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { getSessionFromRequest } from "@/lib/auth/session";
import { store } from "@/lib/data-store";
import { d1Execute, isD1Configured } from "@/lib/d1";

export async function POST(req: Request) {
  try {
    const session = getSessionFromRequest(req);
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "New password must be at least 6 characters long (नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए)" },
        { status: 400 }
      );
    }

    // Must be logged in as SUPER_ADMIN or provide valid current password
    const adminUser = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (!adminUser) {
      return NextResponse.json({ error: "Super Admin account not found" }, { status: 404 });
    }

    if (session && session.role === "SUPER_ADMIN") {
      // Authenticated session authorized
    } else {
      // Verify current password
      const isMatch = await verifyPassword(currentPassword || "", adminUser.password);
      if (!isMatch) {
        return NextResponse.json(
          { error: "Incorrect current master password (वर्तमान मास्टर पासवर्ड गलत है)" },
          { status: 401 }
        );
      }
    }

    const newHashed = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: adminUser.id },
      data: { password: newHashed },
    });

    // Also update Cloudflare D1 if configured
    if (isD1Configured()) {
      try {
        await d1Execute(
          `UPDATE "User" SET password = ? WHERE role = 'SUPER_ADMIN' OR phone = '9664074969'`,
          [newHashed]
        );
      } catch (d1Err) {
        console.warn("Cloudflare D1 Super Admin password update notice:", d1Err);
      }
    }

    // Also update in-memory store if present
    const storeAdmin = store.getUser("usr_super_1");
    if (storeAdmin) {
      (storeAdmin as any).password = newPassword;
    }

    return NextResponse.json({
      success: true,
      message: "Super Admin master password updated successfully (सुपर एडमिन पासवर्ड सफलतापूर्वक अपडेट हो गया)",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: "Failed to update password", details: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
