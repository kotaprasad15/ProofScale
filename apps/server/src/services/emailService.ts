export class EmailService {
  static async sendPasswordResetToken(email: string, token: string): Promise<void> {
    console.log(`\n======================================================`);
    console.log(`📧 EMAIL DISPATCH (Mock)`);
    console.log(`To: ${email}`);
    console.log(`Subject: Reset Your ProofScale Password`);
    console.log(`Body:`);
    console.log(`You requested a password reset. Use the following code/link to reset your password.`);
    console.log(`Token: ${token}`);
    console.log(`======================================================\n`);
  }
}
