import { prisma } from "@/lib/db";
import { hashPassword } from "./password";

/**
 * Seeds ONLY the Super Admin user into Neon PostgreSQL if not present.
 * No default candidates or karyakartas are created.
 */
export async function ensureDefaultUsers() {
  try {
    const admin = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN" },
    });

    if (!admin) {
      console.log("Seeding Master Super Admin into Neon PostgreSQL...");
      const superAdminPassword = await hashPassword("SuperAdmin@2026");
      await prisma.user.create({
        data: {
          id: "usr_super_1",
          name: "Master Super Admin",
          phone: "9999999999",
          password: superAdminPassword,
          role: "SUPER_ADMIN",
        },
      });
      console.log("✅ Super Admin created with secure master password.");
    }
  } catch (error) {
    console.error("Error ensuring Super Admin exists:", error);
  }
}
