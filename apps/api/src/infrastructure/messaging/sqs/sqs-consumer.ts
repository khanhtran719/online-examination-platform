import {
  QueueConsumer,
  QueueDelivery,
} from "../../../shared/application/ports/queue-consumer.port";
import { generationDigest } from "./grading-generation-metadata";
import { createHash } from "node:crypto";
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  ChangeMessageVisibilityCommand,
  GetQueueAttributesCommand,
} from "@aws-sdk/client-sqs";

export interface SqsConsumerSettings {
  region: string;
  queueUrl: string;
  timeoutMs: number;
  endpoint?: string;
  visibilitySeconds: number;
  waitSeconds: number;
  deadLetterArn: string;
  maxReceiveCount: number;
  sourceQueueUrl?: string;
}
export class SqsConsumer implements QueueConsumer {
  private readonly client: SQSClient;
  constructor(private readonly settings: SqsConsumerSettings) {
    this.client = new SQSClient({
      region: settings.region,
      ...(settings.endpoint ? { endpoint: settings.endpoint } : {}),
      ignoreConfiguredEndpointUrls: true,
      useQueueUrlAsEndpoint: false,
      maxAttempts: 1,
      requestHandler: { connectionTimeout: settings.timeoutMs, requestTimeout: settings.timeoutMs },
    });
  }
  private async bounded<T>(work: (signal: AbortSignal) => Promise<T>): Promise<T> {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        work(controller.signal),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(() => {
            controller.abort();
            reject(new Error("QUEUE_UNAVAILABLE"));
          }, this.settings.timeoutMs);
        }),
      ]);
    } catch {
      throw new Error("QUEUE_UNAVAILABLE");
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
  async verify(): Promise<void> {
    const response = await this.bounded((signal) =>
      this.client.send(
        new GetQueueAttributesCommand({
          QueueUrl: this.settings.sourceQueueUrl ?? this.settings.queueUrl,
          AttributeNames: ["QueueArn", "RedrivePolicy", "SqsManagedSseEnabled", "KmsMasterKeyId"],
        }),
        { abortSignal: signal },
      ),
    );
    const a = response.Attributes;
    let policy: { deadLetterTargetArn?: string; maxReceiveCount?: unknown };
    try {
      policy = JSON.parse(a?.RedrivePolicy ?? "");
    } catch {
      throw new Error("QUEUE_CONFIGURATION_INVALID");
    }
    const url = new URL(this.settings.sourceQueueUrl ?? this.settings.queueUrl);
    const expected = `arn:aws:sqs:${this.settings.region}:${url.pathname.split("/")[1]}:${url.pathname.split("/")[2]}`;
    if (
      !a ||
      a.QueueArn !== expected ||
      !policy ||
      policy.deadLetterTargetArn !== this.settings.deadLetterArn ||
      Number(policy.maxReceiveCount) !== this.settings.maxReceiveCount ||
      (a.SqsManagedSseEnabled !== "true" && !a.KmsMasterKeyId)
    )
      throw new Error("QUEUE_CONFIGURATION_INVALID");
    if (this.settings.sourceQueueUrl) {
      const dlq = await this.bounded((signal) =>
        this.client.send(
          new GetQueueAttributesCommand({
            QueueUrl: this.settings.queueUrl,
            AttributeNames: [
              "QueueArn",
              "SqsManagedSseEnabled",
              "KmsMasterKeyId",
              "RedriveAllowPolicy",
            ],
          }),
          { abortSignal: signal },
        ),
      );
      let allow: { redrivePermission?: string; sourceQueueArns?: string[] };
      try {
        allow = JSON.parse(dlq.Attributes?.RedriveAllowPolicy ?? "");
      } catch {
        throw new Error("QUEUE_CONFIGURATION_INVALID");
      }
      if (
        dlq.Attributes?.QueueArn !== this.settings.deadLetterArn ||
        (dlq.Attributes.SqsManagedSseEnabled !== "true" && !dlq.Attributes.KmsMasterKeyId) ||
        allow?.redrivePermission !== "byQueue" ||
        allow.sourceQueueArns?.length !== 1 ||
        allow.sourceQueueArns[0] !== expected
      )
        throw new Error("QUEUE_CONFIGURATION_INVALID");
    }
  }
  async receive(max: number): Promise<QueueDelivery[]> {
    if (!Number.isInteger(max) || max < 1 || max > 8) throw new Error("QUEUE_ADMISSION_INVALID");
    const response = await this.bounded((signal) =>
      this.client.send(
        new ReceiveMessageCommand({
          QueueUrl: this.settings.queueUrl,
          MaxNumberOfMessages: max,
          MessageAttributeNames: ["gradingGeneration"],
          ...(this.settings.sourceQueueUrl
            ? {
                MessageSystemAttributeNames: ["DeadLetterQueueSourceArn" as const],
              }
            : {}),
          WaitTimeSeconds: this.settings.waitSeconds,
          VisibilityTimeout: this.settings.visibilitySeconds,
        }),
        { abortSignal: signal },
      ),
    );
    const messages = response.Messages ?? [];
    if (
      messages.length > max ||
      messages.some(
        (m) =>
          !m.ReceiptHandle ||
          typeof m.Body !== "string" ||
          m.MD5OfBody !== createHash("md5").update(m.Body).digest("hex"),
      )
    )
      throw new Error("QUEUE_RESPONSE_INVALID");
    return messages.map((m) => {
      const attribute = m.MessageAttributes?.gradingGeneration;
      let generation: number | null | undefined;
      if (attribute) {
        const value = attribute.StringValue ?? "";
        if (
          attribute.DataType !== "Number" ||
          !/^(0|[1-9][0-9]{0,3})$/.test(value) ||
          Number(value) > 1000
        )
          generation = null;
        else {
          if (m.MD5OfMessageAttributes !== generationDigest(value))
            throw new Error("QUEUE_RESPONSE_INVALID");
          generation = Number(value);
        }
      }
      if (this.settings.sourceQueueUrl) {
        const source = new URL(this.settings.sourceQueueUrl);
        const arn = `arn:aws:sqs:${this.settings.region}:${source.pathname.split("/")[1]}:${source.pathname.split("/")[2]}`;
        if (m.Attributes?.DeadLetterQueueSourceArn !== arn) generation = null;
      }
      return {
        body: m.Body!,
        receipt: m.ReceiptHandle!,
        ...(generation === undefined ? {} : { generation }),
      };
    });
  }
  async acknowledge(receipt: string): Promise<void> {
    await this.bounded((signal) =>
      this.client.send(
        new DeleteMessageCommand({ QueueUrl: this.settings.queueUrl, ReceiptHandle: receipt }),
        { abortSignal: signal },
      ),
    );
  }
  async extend(receipt: string): Promise<void> {
    await this.bounded((signal) =>
      this.client.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: this.settings.queueUrl,
          ReceiptHandle: receipt,
          VisibilityTimeout: this.settings.visibilitySeconds,
        }),
        { abortSignal: signal },
      ),
    );
  }
  close(): void {
    this.client.destroy();
  }
}
