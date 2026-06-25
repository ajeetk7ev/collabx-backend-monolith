import { v2 as cloudinary } from "cloudinary";
import { env } from "./env";
import { ApiError } from "../utils/ApiError";

// Configure Cloudinary
cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a buffer (from multer memory storage) to Cloudinary.
 * Returns the secure URL of the uploaded image.
 */
export const uploadToCloudinary = (
  buffer: Buffer,
  folder: string = "collabx/workspace-logos",
): Promise<{ secure_url: string; public_id: string }> => {
  console.log("Printing the file buffer ", buffer);
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
        transformation: [
          { width: 256, height: 256, crop: "fill", gravity: "center" },
          { quality: "auto", fetch_format: "auto" },
        ],
      },
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(500, "Failed to upload image to Cloudinary."));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Upload a file buffer to Cloudinary.
 * Uses the caller-specified resource_type (image, video, raw) so that
 * PDFs/docs go through /raw/upload/ and are served as-is.
 */
export const uploadRawFileToCloudinary = (
  buffer: Buffer,
  filename: string,
  resourceType: "image" | "video" | "raw" = "raw",
  folder: string = "collabx/files",
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const options: any = {
      folder,
      resource_type: resourceType,
    };

    if (resourceType === "raw") {
      const extIndex = filename.lastIndexOf(".");
      const name = extIndex !== -1 ? filename.substring(0, extIndex) : filename;
      const ext = extIndex !== -1 ? filename.substring(extIndex) : "";
      
      const cleanName = name
        .replace(/[^a-zA-Z0-9-_]/g, "_")
        .replace(/_+/g, "_");
        
      const uniqueSuffix = Math.random().toString(36).substring(2, 8);
      // For raw resources, the public_id MUST include the extension to be served with the correct Content-Type.
      options.public_id = `${cleanName}_${uniqueSuffix}${ext}`;
    } else {
      options.use_filename = true;
      options.unique_filename = true;
    }

    const stream = cloudinary.uploader.upload_stream(
      options,
      (error, result) => {
        if (error || !result) {
          reject(new ApiError(500, "Failed to upload file to Cloudinary."));
          return;
        }
        resolve({
          secure_url: result.secure_url,
          public_id: result.public_id,
        });
      },
    );
    stream.end(buffer);
  });
};

/**
 * Delete an asset from Cloudinary by its public ID.
 * Must pass the correct resource_type — destroy defaults to "image",
 * so raw/video assets would silently fail without it.
 */
export const deleteFromCloudinary = async (
  publicId: string,
  resourceType: "image" | "video" | "raw" = "image",
): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (error) {
    // Log but don't throw — cleanup failure shouldn't block the operation
    console.error(`Failed to delete Cloudinary asset: ${publicId}`, error);
  }
};

export { cloudinary };
