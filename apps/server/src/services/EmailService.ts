interface OtpEmail {
  email: string;
  code: string;
  purpose: "signup_verification" | "password_reset";
}

interface SentEmail {
  to: string;
  subject: string;
  text: string;
  code?: string;
}

/** Minimal Resend transport with a local/test outbox. */
export class EmailService {
  private static readonly outbox: SentEmail[] = [];

  static getTestOutbox(): readonly SentEmail[] {
    return this.outbox;
  }

  static clearTestOutbox(): void {
    this.outbox.length = 0;
  }

  static async sendOtp({ email, code, purpose }: OtpEmail): Promise<void> {
    const subject = purpose === "password_reset"
      ? "Your Ratecap password reset code"
      : "Verify your Ratecap email";
    const action = purpose === "password_reset" ? "reset your password" : "verify your email address";
    await this.send({
      to: email,
      subject,
      code,
      text: `Your Ratecap code is ${code}. Use it to ${action}. It expires in 10 minutes. If you didn't request this, you can safely ignore this email.`
    });
  }

  static async sendPasswordChanged(email: string): Promise<void> {
    await this.send({
      to: email,
      subject: "Your Ratecap password was changed",
      text: "Your Ratecap password was changed. All existing sessions were signed out. If you did not make this change, contact support immediately."
    });
  }

  private static async send(message: SentEmail): Promise<void> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("RESEND_API_KEY must be configured in production.");
      }
      this.outbox.push(message);
      return;
    }

    const from = process.env.RESEND_FROM;
    if (!from) throw new Error("RESEND_FROM must be configured when RESEND_API_KEY is set.");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ from, to: [message.to], subject: message.subject, text: message.text })
    });

    if (!response.ok) {
      throw new Error(`Resend rejected email delivery (${response.status}).`);
    }
  }
}
