import { log } from "./utils/logger.js";

const CLOUDINARY_API = "https://api.cloudinary.com/v1_1";

interface UploadResult {
  secure_url: string;
  public_id: string;
}

/**
 * Upload an image buffer to Cloudinary.
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in env.
 * Returns the secure URL of the uploaded image, or null if not configured.
 */
export async function uploadToCloudinary(
  imageBuffer: Buffer,
  folder: string
): Promise<string | null> {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    log.info("Cloudinary not configured — skipping upload");
    return null;
  }

  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Cloudinary requires a signature over sorted params
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = await sha1(paramsToSign);

  const b64Data = `data:image/png;base64,${imageBuffer.toString("base64")}`;

  const formData = new FormData();
  formData.append("file", b64Data);
  formData.append("folder", folder);
  formData.append("timestamp", timestamp);
  formData.append("api_key", apiKey);
  formData.append("signature", signature);

  log.info(`  uploading to Cloudinary (folder: ${folder})...`);

  try {
    const res = await fetch(`${CLOUDINARY_API}/${cloudName}/image/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text();
      log.warning(`  Cloudinary error ${res.status}: ${errBody}`);
      return null;
    }

    const result = (await res.json()) as UploadResult;
    log.info(`  → uploaded: ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    log.warning(`  Cloudinary upload failed: ${err}`);
    return null;
  }
}

async function sha1(input: string): Promise<string> {
  const { createHash } = await import("crypto");
  return createHash("sha1").update(input).digest("hex");
}
