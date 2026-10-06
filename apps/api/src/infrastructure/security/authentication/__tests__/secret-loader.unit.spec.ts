import { loadRuntimeConfig } from "../secret-loader";
describe("entry point configuration", () => {
  it("fails startup with absent secrets rather than generating an ephemeral signing identity", async () => {
    await expect(
      loadRuntimeConfig(
        { NODE_ENV: "production", PUBLIC_ORIGIN: "https://exam.example.test" },
        "api",
      ),
    ).rejects.toThrow("Invalid runtime configuration");
  });
  it("rejects non HTTPS production origins and private signing credentials in the worker", async () => {
    await expect(
      loadRuntimeConfig(
        { NODE_ENV: "production", PUBLIC_ORIGIN: "http://exam.example.test" },
        "api",
      ),
    ).rejects.toThrow();
    await expect(
      loadRuntimeConfig(
        {
          NODE_ENV: "test",
          PUBLIC_ORIGIN: "http://localhost:3000",
          JWT_PRIVATE_KEY_FILE: "private.pem",
        },
        "worker",
      ),
    ).rejects.toThrow();
  });
});
