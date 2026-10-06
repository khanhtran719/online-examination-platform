import nodemailer, { Transporter } from "nodemailer";
import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import {
  MailDeliveryError,
  VerificationMail,
} from "../../application/ports/verification-delivery.port";
const content = (link: string) =>
  `Xác thực email của bạn\n\nMở liên kết, rồi chọn mật khẩu cuối cùng của bạn: ${link}\n\nLiên kết có hiệu lực 30 phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.`;
export class SmtpVerificationMail implements VerificationMail {
  private readonly transport: Transporter;
  constructor(
    host: string,
    port: number,
    private readonly from: string,
  ) {
    if (!["127.0.0.1", "localhost", "mailpit"].includes(host))
      throw new Error("Local SMTP host required");
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure: false,
      connectionTimeout: 1000,
      greetingTimeout: 1000,
      socketTimeout: 3000,
    });
  }
  async send(email: string, link: string): Promise<void> {
    try {
      await this.transport.sendMail({
        from: this.from,
        to: email,
        subject: "Xác thực email — Online Examination",
        text: content(link),
        disableFileAccess: true,
        disableUrlAccess: true,
      });
    } catch {
      throw new MailDeliveryError(true);
    }
  }
  close(): void {
    this.transport.close();
  }
}
export interface SesSendClient {
  send(command: SendEmailCommand, options: { abortSignal: AbortSignal }): Promise<unknown>;
  destroy(): void;
}
export class SesVerificationMail implements VerificationMail {
  private readonly client: SesSendClient;
  constructor(
    region: string,
    private readonly from: string,
    private readonly configurationSet?: string,
    client?: SesSendClient,
  ) {
    this.client = client ?? new SESv2Client({ region, maxAttempts: 1 });
  }
  async send(email: string, link: string): Promise<void> {
    const abort = new AbortController(),
      timer = setTimeout(() => abort.abort(), 5000);
    try {
      await this.client.send(
        new SendEmailCommand({
          FromEmailAddress: this.from,
          Destination: { ToAddresses: [email] },
          ConfigurationSetName: this.configurationSet,
          Content: {
            Simple: {
              Subject: { Data: "Xác thực email — Online Examination", Charset: "UTF-8" },
              Body: { Text: { Data: content(link), Charset: "UTF-8" } },
            },
          },
        }),
        { abortSignal: abort.signal },
      );
    } catch (error) {
      const name = error && typeof error === "object" && "name" in error ? error.name : undefined;
      throw new MailDeliveryError(
        ![
          "MessageRejected",
          "BadRequestException",
          "MailFromDomainNotVerifiedException",
          "NotFoundException",
        ].includes(String(name)),
      );
    } finally {
      clearTimeout(timer);
    }
  }
  close(): void {
    this.client.destroy();
  }
}
