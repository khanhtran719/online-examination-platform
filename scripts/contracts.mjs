import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import SwaggerParser from "@apidevtools/swagger-parser";
import Ajv from "ajv";
import addFormats from "ajv-formats";

const methods = new Set([
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "head",
  "options",
]);
const owners = new Set([
  "Identity",
  "Catalog",
  "Assessment",
  "Reporting",
  "Platform",
]);
const publicRoutes = new Set([
  "get /v1/auth/csrf",
  "post /v1/auth/register",
  "post /v1/auth/login",
  "post /v1/auth/refresh",
  "post /v1/auth/logout",
  "get /live",
  "get /ready",
]);

export function inspectOperations(api) {
  const errors = [];
  const operationIds = new Set();
  for (const [path, item] of Object.entries(api.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      const label = `${method.toUpperCase()} ${path}`;
      const isPublic = publicRoutes.has(`${method} ${path}`);
      if (!operation.operationId || operationIds.has(operation.operationId))
        errors.push(`${label}: missing or duplicate operationId`);
      operationIds.add(operation.operationId);
      const unsafe = !["get", "head", "options"].includes(method);
      const security = operation.security ?? api.security ?? [];
      if (!owners.has(operation["x-owner"]))
        errors.push(`${label}: unknown owner`);
      if (!Array.isArray(operation["x-cases"]) || !operation["x-cases"].length)
        errors.push(`${label}: missing acceptance cases`);
      if (
        !Array.isArray(operation["x-permissions"]) ||
        (!isPublic && !operation["x-permissions"].length)
      )
        errors.push(`${label}: missing permissions`);
      if (
        !isPublic &&
        (!security.length ||
          security.some(
            (alternative) => !Object.hasOwn(alternative, "AccessCookie"),
          ))
      )
        errors.push(`${label}: authentication can be bypassed`);
      if (
        unsafe &&
        (!security.length ||
          security.some(
            (alternative) => !Object.hasOwn(alternative, "CsrfHeader"),
          ))
      )
        errors.push(`${label}: missing CSRF requirement`);
      if (operation["x-flow"] !== (unsafe ? "write" : "read"))
        errors.push(`${label}: incorrect read/write classification`);
      if (
        typeof operation["x-transaction"] !== "string" ||
        (unsafe && operation["x-transaction"] === "none")
      )
        errors.push(`${label}: missing transaction contract`);
      const parameters = [
        ...(item.parameters ?? []),
        ...(operation.parameters ?? []),
      ];
      if (
        unsafe &&
        !parameters.some(
          (parameter) =>
            parameter.in === "header" &&
            parameter.name === "Origin" &&
            parameter.required,
        )
      )
        errors.push(`${label}: missing required Origin`);
      if (unsafe && !isPublic && operation["x-idempotency"] !== true)
        errors.push(
          `${label}: authenticated mutation missing idempotency contract`,
        );
      if (
        operation["x-idempotency"] &&
        !parameters.some(
          (parameter) =>
            parameter.in === "header" &&
            parameter.name === "Idempotency-Key" &&
            parameter.required,
        )
      )
        errors.push(`${label}: missing required Idempotency-Key`);
      if (operation["x-paginated"]) {
        const pageSize = parameters.find(
          (parameter) =>
            parameter.in === "query" && parameter.name === "pageSize",
        );
        if (
          !pageSize ||
          pageSize.schema.minimum !== 1 ||
          pageSize.schema.maximum !== 100 ||
          pageSize.schema.default !== 20
        )
          errors.push(`${label}: missing bounded pageSize`);
        if (
          !parameters.some(
            (parameter) =>
              parameter.name === "cursor" && parameter.in === "query",
          )
        )
          errors.push(`${label}: missing keyset cursor`);
      }
    }
  }
  return errors;
}

export function validateEvent(contracts, event) {
  if (!contracts.eventValidator(event))
    return contracts.eventValidator.errors.map(
      (error) => `${error.instancePath}: ${error.message}`,
    );
  const errors = [];
  if (event.aggregateId !== event.payload.attemptId)
    errors.push("aggregateId differs from attemptId");
  const occurredAt = Date.parse(event.occurredAt);
  const deadline = Date.parse(event.payload.deadline);
  if (!Number.isFinite(occurredAt) || !Number.isFinite(deadline))
    return ["unsupported/non-finite timestamp"];
  const expired = occurredAt >= deadline;
  if (
    event.payload.expired !== expired ||
    event.payload.submissionKind !== (expired ? "DEADLINE" : "MANUAL")
  )
    errors.push("deadline/submissionKind/expired disagree");
  return errors;
}

export async function loadContracts(root) {
  // Do not allow a contract to resolve external files/URLs during checks.
  const api = await SwaggerParser.validate(
    resolve(root, "docs/contracts/openapi.yaml"),
    { resolve: { external: false } },
  );
  const errors = inspectOperations(api);
  const caseIds = new Set(
    [
      ...readFileSync(resolve(root, "docs/contract-tests.md"), "utf8").matchAll(
        /\|\s*(AC-\d+)\s*\|/g,
      ),
    ].map((match) => match[1]),
  );
  let operationCount = 0;
  for (const item of Object.values(api.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      operationCount += 1;
      for (const id of operation["x-cases"] ?? [])
        if (!caseIds.has(id))
          errors.push(
            `${operation.operationId}: unknown acceptance case ${id}`,
          );
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schemas = Object.fromEntries(
    Object.entries(api.components.schemas).map(([name, schema]) => [
      name,
      ajv.compile(schema),
    ]),
  );
  let exampleCount = 0;
  function checkExample(schema, example, label) {
    const validate = ajv.compile(schema);
    if (!validate(example))
      throw new Error(`${label}: ${ajv.errorsText(validate.errors)}`);
    if (
      example &&
      typeof example === "object" &&
      Object.hasOwn(example, "errorCode")
    ) {
      if (
        example.status === false &&
        (example.data !== null || example.errorCode !== example.message)
      )
        throw new Error(`${label}: unsafe error envelope`);
      if (
        example.status === true &&
        (example.errorCode !== "" || example.message !== "OK")
      )
        throw new Error(`${label}: inconsistent success envelope`);
    }
    exampleCount += 1;
  }
  for (const [name, schema] of Object.entries(api.components.schemas))
    if (Object.hasOwn(schema, "example"))
      checkExample(schema, schema.example, name);
  for (const item of Object.values(api.paths)) {
    for (const [method, operation] of Object.entries(item)) {
      if (!methods.has(method)) continue;
      const media = [
        ...Object.values(operation.requestBody?.content ?? {}),
        ...Object.values(operation.responses).flatMap((response) =>
          Object.values(response.content ?? {}),
        ),
      ];
      for (const entry of media) {
        if (Object.hasOwn(entry, "example"))
          checkExample(entry.schema, entry.example, operation.operationId);
        for (const example of Object.values(entry.examples ?? {}))
          if (Object.hasOwn(example, "value"))
            checkExample(entry.schema, example.value, operation.operationId);
      }
    }
  }
  const event = JSON.parse(
    readFileSync(
      resolve(root, "docs/contracts/attempt-submitted.v1.schema.json"),
      "utf8",
    ),
  );
  const contracts = {
    api,
    event,
    schemas,
    eventValidator: ajv.compile(event),
    operationCount,
    exampleCount,
  };
  for (const example of event.examples ?? []) {
    const eventErrors = validateEvent(contracts, example);
    if (eventErrors.length) throw new Error(eventErrors.join("\n"));
  }
  return contracts;
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
) {
  const contracts = await loadContracts(resolve(import.meta.dirname, ".."));
  process.stdout.write(
    `Contracts passed: ${contracts.operationCount} operations, ${contracts.exampleCount} examples, event schema and declared boundary metadata. Runtime security/durability/SLO remain unverified.\n`,
  );
}
