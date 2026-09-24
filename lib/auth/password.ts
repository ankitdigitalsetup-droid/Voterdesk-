import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hashes a plaintext password using bcrypt.
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies a plaintext password against a bcrypt hash or fallback plaintext match.
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;

  // If already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    return bcrypt.compare(password, hash);
  }

  // Plaintext backward compatibility fallback (will be upgraded on next save)
  return password === hash;
}
