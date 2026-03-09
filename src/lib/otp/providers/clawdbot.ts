import type { OtpProvider, OtpProviderResult } from "../service";

export type { OtpProvider };

/**
 * Clawdbot webhook OTP provider.
 * TODO: Integrate with your Clawdbot webhook.
 * - Set OTP_PROVIDER=clawdbot in .env.local
 * - Set CLAWDBOT_WEBHOOK_URL to your webhook endpoint
 * - Implement the HTTP request to send OTP via WhatsApp
 */
export const clawdbotProvider: OtpProvider = {
  async sendOtp(waNumber: string, code: string): Promise<OtpProviderResult> {
    const webhookUrl = process.env.CLAWDBOT_WEBHOOK_URL;
    if (!webhookUrl) {
      console.error("[Clawdbot] CLAWDBOT_WEBHOOK_URL is not set");
      return { success: false, error: "OTP provider not configured" };
    }

    try {
      // TODO: Replace with your Clawdbot webhook payload structure
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: waNumber,
          message: `Kode verifikasi Warga Digital Anda: ${code}. Jangan bagikan kode ini.`,
          otp: code,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        console.error("[Clawdbot] Webhook error:", response.status, text);
        return { success: false, error: `Webhook failed: ${response.status}` };
      }

      const data = (await response.json()) as { messageId?: string };
      return { success: true, messageId: data.messageId };
    } catch (err) {
      console.error("[Clawdbot] Send failed:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : "Unknown error",
      };
    }
  },
};
