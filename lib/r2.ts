import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID || "";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.R2_BUCKET_NAME || "voterdesk2026";
const publicUrl = process.env.R2_PUBLIC_URL || "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: accountId ? `https://${accountId}.r2.cloudflarestorage.com` : "https://r2.cloudflarestorage.com",
  credentials: {
    accessKeyId: accessKeyId || "placeholder",
    secretAccessKey: secretAccessKey || "placeholder",
  },
});

/**
 * Uploads a file buffer to Cloudflare R2 bucket.
 * Returns public URL if R2_PUBLIC_URL is configured, or standard S3 key.
 */
export async function uploadToR2(
  fileBuffer: Buffer | Uint8Array,
  fileName: string,
  contentType: string
): Promise<string> {
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error("Cloudflare R2 storage credentials are not configured in environment variables.");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: fileName,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await r2Client.send(command);

  if (publicUrl) {
    return `${publicUrl.replace(/\/$/, "")}/${fileName}`;
  }
  return `https://${bucketName}.${accountId}.r2.cloudflarestorage.com/${fileName}`;
}
