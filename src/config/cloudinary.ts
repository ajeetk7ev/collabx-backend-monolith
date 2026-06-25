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
 * Upload a raw file buffer to Cloudinary with auto resource type.
 */
export const uploadRawFileToCloudinary = (
  buffer: Buffer,
  filename: string,
  folder: string = "collabx/files",
): Promise<{ secure_url: string; public_id: string }> => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        public_id: filename.substring(0, filename.lastIndexOf(".")) || filename,
        use_filename: true,
        unique_filename: true,
      },
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
 * Delete an image from Cloudinary by its public ID.
 */
export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    // Log but don't throw — cleanup failure shouldn't block the operation
    console.error(`Failed to delete Cloudinary asset: ${publicId}`, error);
  }
};

export { cloudinary };
