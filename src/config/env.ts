import dotenv from "dotenv";
dotenv.config();

const envVars = process.env;

export const env = {
  PORT: envVars.PORT || "5001",
  ACCESS_TOKEN_SECRET: envVars.ACCESS_TOKEN_SECRET || "some_super_secret_access_token_key_12345",
  ACCESS_TOKEN_EXPIRY: envVars.ACCESS_TOKEN_EXPIRY || "1d",
  REFRESH_TOKEN_SECRET: envVars.REFRESH_TOKEN_SECRET || "some_super_secret_refresh_token_key_67890",
  REFRESH_TOKEN_EXPIRY: envVars.REFRESH_TOKEN_EXPIRY || "7d",

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: envVars.CLOUDINARY_CLOUD_NAME || "",
  CLOUDINARY_API_KEY: envVars.CLOUDINARY_API_KEY || "",
  CLOUDINARY_API_SECRET: envVars.CLOUDINARY_API_SECRET || "",
};
