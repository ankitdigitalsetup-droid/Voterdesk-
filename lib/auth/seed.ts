import { prisma } from "@/lib/db";
import { hashPassword } from "./password";

/**
 * Seeds ONLY the Super Admin user into Neon PostgreSQL if not present.
 * No default candidates or karyakartas are created.
 */
export async function ensureDefaultUsers() {
  try {
    const superAdminPassword = await hashPassword("96640749699664074969");

    const admin = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: "9664074969" },
          { phone: "9999999999" },
          { role: "SUPER_ADMIN" },
          { id: "usr_super_1" },
        ],
      },
    });

    if (!admin) {
      await prisma.user.create({
        data: {
          id: "usr_super_1",
          name: "Master Super Admin",
          phone: "9664074969",
          password: superAdminPassword,
          role: "SUPER_ADMIN",
        },
      });
      console.log("✅ Super Admin created with phone 9664074969 and 20-digit password.");
    } else {
      await prisma.user.update({
        where: { id: admin.id },
        data: {
          phone: "9664074969",
          password: superAdminPassword,
          role: "SUPER_ADMIN",
        },
      });
      console.log("✅ Super Admin updated with phone 9664074969 and 20-digit password.");
    }
  } catch (error) {
    console.error("Error ensuring Super Admin exists:", error);
  }
}
