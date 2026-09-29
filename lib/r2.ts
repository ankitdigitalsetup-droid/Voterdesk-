import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const accountId = process.env.R2_ACCOUNT_ID || "48dd8f0ce260be7090d1522b68edbaa2";
const accessKeyId = process.env.R2_ACCESS_KEY_ID || "e199f16e7bd18f12a7718718268bcab2";
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY || "1c95139bdcfa5f83f21b2135965a4011d39b96f5b0142e57a00f7964696eefa9";
const bucketName = process.env.R2_BUCKET_NAME || "voterdesk2026";
const publicUrl = process.env.R2_PUBLIC_URL || "";

export const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId,
    secretAccessKey,
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
