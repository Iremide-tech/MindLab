import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icon(?:\\.svg)?|apple-icon|opengraph-image|twitter-image|mindlab-mark|login|signup|auth|pricing|privacy|terms|api/payments/webhook|api/payments/paystack-webhook|api/stripe/webhook|api/auth/signup).*)",
  ],
};
