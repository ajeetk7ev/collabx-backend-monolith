import { Request, Response } from "express";
import { AuthService } from "../services/auth.service";
import { ApiResponse } from "../utils/ApiResponse";
import jwt from "jsonwebtoken";
import { env } from "../config/env";

const cookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
};

export class AuthController {
  static async signUp(req: Request, res: Response): Promise<void> {
    const user = await AuthService.signUp(req.body);

    res.status(201).json(
      new ApiResponse(201, null, "User registered successfully")
    );
  }

  static async signIn(req: Request, res: Response): Promise<void> {
    const { email, password } = req.body;
    const { user, accessToken, refreshToken } = await AuthService.signIn(email, password);

    // Set cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(200).json(
      new ApiResponse(200, { user }, "User logged in successfully")
    );
  }

  static async logout(req: Request, res: Response): Promise<void> {
    // Attempt to decode user ID from access token to clear DB record
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "");
    if (token) {
      try {
        const decoded = jwt.verify(token, env.ACCESS_TOKEN_SECRET) as { id: number };
        if (decoded?.id) {
          await AuthService.logout(decoded.id);
        }
      } catch (error) {
        // Token might be expired, check refresh token cookie as well
        const refToken = req.cookies?.refreshToken;
        if (refToken) {
          try {
            const decodedRef = jwt.verify(refToken, env.REFRESH_TOKEN_SECRET) as { id: number };
            if (decodedRef?.id) {
              await AuthService.logout(decodedRef.id);
            }
          } catch (err) {
            // Ignore token verification errors during logout
          }
        }
      }
    }

    // Clear cookies
    res.clearCookie("accessToken", cookieOptions);
    res.clearCookie("refreshToken", cookieOptions);

    res.status(200).json(
      new ApiResponse(200, null, "User logged out successfully")
    );
  }

  static async refresh(req: Request, res: Response): Promise<void> {
    const token = req.cookies?.refreshToken;
    const { user, accessToken, refreshToken } = await AuthService.refresh(token);

    // Set new cookies
    res.cookie("accessToken", accessToken, cookieOptions);
    res.cookie("refreshToken", refreshToken, cookieOptions);

    res.status(200).json(
      new ApiResponse(200, { user }, "Tokens refreshed successfully")
    );
  }
}
