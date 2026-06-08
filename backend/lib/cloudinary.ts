import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import path from "path";

// Initialize Cloudinary if credentials exist
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isCloudinaryConfigured = !!(cloudName && apiKey && apiSecret);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
}

interface UploadResponse {
  url: string;
  publicId?: string;
  success: boolean;
}

/**
 * Uploads a file buffer or base64 string.
 * Falls back to local filesystem storage (under public/uploads/) if Cloudinary is not configured.
 */
export async function uploadFile(
  fileBuffer: Buffer,
  fileName: string,
  folder: string = "lending_platform"
): Promise<UploadResponse> {
  if (isCloudinaryConfigured) {
    try {
      const result = await Promise.race([
        new Promise<any>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder,
              resource_type: "auto",
              public_id: path.parse(fileName).name + "_" + Date.now(),
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          uploadStream.end(fileBuffer);
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("Cloudinary upload timed out")), 4000)
        )
      ]);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        success: true,
      };
    } catch (error) {
      console.error("[CLOUDINARY ERROR] Upload failed, falling back to local:", error);
      // Fall through to local upload on error
    }
  }

  // Fallback: local storage under public/uploads
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", folder);
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    const uniqueFileName = `${Date.now()}-${fileName}`;
    const filePath = path.join(uploadDir, uniqueFileName);
    fs.writeFileSync(filePath, fileBuffer);

    // Return url accessible from frontend
    const url = `/uploads/${folder}/${uniqueFileName}`;
    console.log(`[LOCAL UPLOAD SUCCESS] Saved locally to: ${url}`);
    return {
      url,
      success: true,
    };
  } catch (error) {
    console.error("[LOCAL UPLOAD ERROR] Failed to save file:", error);
    throw new Error("File upload failed");
  }
}
