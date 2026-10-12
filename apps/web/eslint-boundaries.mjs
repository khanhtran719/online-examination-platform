import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("./src/", import.meta.url));
const facades = new Set(["runtime", "session", "memory", "use-title"]);
function parts(filename) {
  return relative(root, filename).split(sep);
}

export const webBoundaries = {
  rules: {
    imports: {
      meta: {
        type: "problem",
        schema: [],
        messages: {
          boundary: "Frontend boundary: {{reason}}. See docs/web-ui/frontend-architecture.md.",
        },
      },
      create(context) {
        const filename = context.filename;
        const [owner, feature, area] = parts(filename);
        if (!["app", "shared", "features", "live", "demo"].includes(owner)) return {};
        const report = (node, reason) =>
          context.report({ node, messageId: "boundary", data: { reason } });
        function inspect(node, source) {
          if (typeof source?.value !== "string") {
            report(node, "dynamic import must have a literal target for boundary checking");
            return;
          }
          const value = source.value;
          const target = value.startsWith("@web/")
            ? resolve(root, value.slice(5))
            : value.startsWith(".")
              ? resolve(filename, "..", value)
              : null;
          if (!target) {
            if (
              (owner === "features" || (owner === "shared" && feature === "ui")) &&
              /^(axios|ky|node:|pg$|@aws-sdk\/|@web$)/.test(value)
            )
              report(
                node,
                "use the injected PlatformApi instead of transport/vendor implementations",
              );
            return;
          }
          const [to, toFeature, toArea] = parts(target);
          if (to === "..") return report(node, "internal imports must stay inside Web src");
          if (owner === "shared" && to !== "shared")
            return report(node, "shared code cannot depend on app, features or adapters");
          if (owner === "live" && to === "demo")
            return report(node, "live code cannot depend on the demo adapter");
          if (owner === "features") {
            if (["live", "demo"].includes(to))
              return report(node, "features use PlatformApi, never concrete live/demo adapters");
            if (to === "features" && feature !== toFeature)
              return report(
                node,
                "a feature cannot import another feature's internals; compose in app",
              );
            if (
              to === "app" &&
              !facades.has((toFeature ?? "").replace(/\.(tsx?|jsx?)$/, "")) &&
              !(
                feature === "admin" &&
                area === "admin-layout.tsx" &&
                (toFeature ?? "").replace(/\.tsx$/, "") === "workspace-frame"
              )
            ) {
              return report(
                node,
                "feature access to app is limited to runtime, session, memory and use-title facades (Admin layout may use WorkspaceFrame)",
              );
            }
          }
          if (
            (owner === "features" || (owner === "shared" && feature === "ui")) &&
            to === "shared" &&
            toFeature === "api" &&
            /^(http|parse)(\.|$)/.test(toArea ?? "")
          ) {
            report(node, "transport and parsing belong to adapters, not UI/features");
          }
        }
        return {
          ImportDeclaration: (node) => inspect(node, node.source),
          ExportNamedDeclaration: (node) => node.source && inspect(node, node.source),
          ExportAllDeclaration: (node) => inspect(node, node.source),
          ImportExpression: (node) => inspect(node, node.source),
          CallExpression(node) {
            const restricted = owner === "features" || (owner === "shared" && feature === "ui");
            const callee = node.callee;
            if (
              restricted &&
              (callee.name === "fetch" ||
                (callee.type === "MemberExpression" &&
                  ["window", "globalThis"].includes(callee.object.name) &&
                  callee.property.name === "fetch"))
            ) {
              report(node, "use the injected PlatformApi instead of fetch in UI/features");
            }
          },
        };
      },
    },
  },
};
