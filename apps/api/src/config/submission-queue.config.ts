/** Shared regional Standard queue URL validation; local overrides are loopback-only. */
export function submissionQueueConfig(env: NodeJS.ProcessEnv) {
  const region = env.AWS_REGION ?? "";
  if (!/^[a-z]{2}-[a-z]+-\d$/.test(region)) throw new Error("Invalid AWS_REGION");
  let queue: URL;
  let endpoint: URL | undefined;
  try {
    queue = new URL(env.SUBMISSION_QUEUE_URL ?? "");
    if (env.SQS_ENDPOINT) endpoint = new URL(env.SQS_ENDPOINT);
  } catch {
    throw new Error("Invalid submission queue URL");
  }
  if (
    queue.username ||
    queue.password ||
    queue.search ||
    queue.hash ||
    !/^\/\d{12}\/[A-Za-z0-9_-]{1,80}$/.test(queue.pathname)
  ) {
    throw new Error("Invalid Standard queue URL");
  }
  if (endpoint) {
    if (
      env.NODE_ENV === "production" ||
      endpoint.protocol !== "http:" ||
      !["localhost", "127.0.0.1"].includes(endpoint.hostname) ||
      endpoint.username ||
      endpoint.password ||
      endpoint.search ||
      endpoint.hash ||
      endpoint.pathname !== "/" ||
      queue.origin !== endpoint.origin
    ) {
      throw new Error("Invalid local SQS endpoint");
    }
  } else if (
    queue.protocol !== "https:" ||
    queue.port ||
    queue.hostname !== `sqs.${region}.amazonaws.com`
  ) {
    throw new Error("Queue must use regional AWS HTTPS");
  }
  return {
    region,
    queueUrl: queue.toString(),
    ...(endpoint ? { endpoint: endpoint.toString() } : {}),
  };
}
