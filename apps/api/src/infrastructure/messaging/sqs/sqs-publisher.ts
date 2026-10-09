import { generationDigest } from "./grading-generation-metadata";
import { createHash } from "node:crypto";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import {
  QueuePublisher,
  QueuePublishError,
} from "../../../shared/application/ports/queue-publisher.port";

export interface SqsPublisherSettings {
  region: string;
  queueUrl: string;
  timeoutMs: number;
  endpoint?: string;
}

export class SqsPublisher implements QueuePublisher {
  private readonly client: SQSClient;
  constructor(private readonly settings: SqsPublisherSettings) {
    this.client = new SQSClient({
      region: settings.region,
      ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
      ignoreConfiguredEndpointUrls: true,
      useQueueUrlAsEndpoint: false,
      maxAttempts: 1, // Durable outbox is the only retry owner.
      requestHandler: { connectionTimeout: settings.timeoutMs, requestTimeout: settings.timeoutMs },
    });
  }

  async publish(body: string, generation = 0): Promise<void> {
    if (!Number.isInteger(generation) || generation < 0 || generation > 1000)
      throw new QueuePublishError(true);
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const deadline = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          controller.abort();
          reject(new QueuePublishError(false));
        }, this.settings.timeoutMs);
      });
      // Also bounds credential-provider resolution, which is not aborted by HTTP cancellation.
      const result = await Promise.race([
        deadline,
        this.client.send(
          new SendMessageCommand({
            QueueUrl: this.settings.queueUrl,
            MessageBody: body,
            ...(generation > 0
              ? {
                  MessageAttributes: {
                    gradingGeneration: {
                      DataType: "Number",
                      StringValue: String(generation),
                    },
                  },
                }
              : {}),
          }),
          { abortSignal: controller.signal },
        ),
      ]);
      if (
        !result.MessageId ||
        result.MD5OfMessageBody !== createHash("md5").update(body).digest("hex") ||
        (generation > 0 && result.MD5OfMessageAttributes !== generationDigest(String(generation)))
      ) {
        throw new QueuePublishError(false);
      }
    } catch (error) {
      const name = error instanceof Error ? error.name : "";
      const permanent = [
        "InvalidMessageContents",
        "InvalidAddress",
        "QueueDoesNotExist",
        "AccessDenied",
        "AccessDeniedException",
        "InvalidSecurity",
        "KmsAccessDenied",
        "KmsNotFound",
        "UnsupportedOperation",
      ].includes(name);
      throw new QueuePublishError(permanent);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  close(): void {
    this.client.destroy();
  }
}
