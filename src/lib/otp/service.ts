import { mockProvider } from "./providers/mock";
import { clawdbotProvider } from "./providers/clawdbot";

export interface OtpProviderResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface OtpProvider {
  sendOtp(waNumber: string, code: string): Promise<OtpProviderResult>;
}

export function getOtpProvider(): OtpProvider {
  const provider = process.env.OTP_PROVIDER ?? "mock";
  return provider === "clawdbot" ? clawdbotProvider : mockProvider;
}
