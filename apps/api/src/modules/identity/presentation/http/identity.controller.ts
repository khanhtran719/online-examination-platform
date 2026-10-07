import { Body, Controller, Get, HttpCode, Inject, Post, Put, Req, Res } from "@nestjs/common";
import { FastifyReply, FastifyRequest } from "fastify";
import { IdentityService } from "../../application/services/identity.service";
import { invalidRequest } from "../../domain/errors/index";
import { body, email, password, profileInput, text } from "./dto/identity.dto";
import { HTTP_SESSION, HttpSessionPort } from "./http-session.port";
@Controller("v1")
export class IdentityController {
  constructor(
    @Inject(IdentityService) private readonly identity: IdentityService,
    @Inject(HTTP_SESSION) private readonly transport: HttpSessionPort,
  ) {}
  @Get("auth/csrf") async csrf(
    @Req() r: FastifyRequest,
    @Res({ passthrough: true }) s: FastifyReply,
  ) {
    await this.transport.admit(r, "read");
    return await this.transport.csrfResponse(r, s);
  }
  @Post("auth/register") @HttpCode(202) async register(
    @Req() r: FastifyRequest,
    @Body() value: unknown,
  ) {
    await this.transport.checkUnsafe(r);
    await this.transport.admit(r, "write");
    await this.transport.registerAdmission(r);
    const v = body(value, ["email", "displayName", "password"]);
    await this.identity.register({
      email: email(v.email),
      displayName: text(v.displayName, 1, 80),
      password: password(v.password),
    });
    return { accepted: true };
  }
  @Post("auth/email-verification/request") @HttpCode(202) async requestVerification(
    @Req() r: FastifyRequest,
    @Body() value: unknown,
  ) {
    await this.transport.checkUnsafe(r, "anonymous");
    await this.transport.admit(r, "write");
    const v = body(value, ["email"]);
    await this.identity.requestVerification(email(v.email));
    return { accepted: true };
  }
  @Post("auth/email-verification/confirm") @HttpCode(200) async confirm(
    @Req() r: FastifyRequest,
    @Body() value: unknown,
  ) {
    await this.transport.checkUnsafe(r, "anonymous");
    await this.transport.admit(r, "write");
    const v = body(value, ["token", "password"]);
    await this.identity.confirm(text(v.token, 43, 43), password(v.password));
    return { verified: true };
  }
  @Post("auth/login") @HttpCode(200) async login(
    @Req() r: FastifyRequest,
    @Res({ passthrough: true }) s: FastifyReply,
    @Body() value: unknown,
  ) {
    await this.transport.checkUnsafe(r);
    await this.transport.admit(r, "write");
    const v = body(value, ["email", "password"]);
    return this.transport.session(
      s,
      await this.identity.login(email(v.email), password(v.password, 1), r.id),
    );
  }
  @Post("auth/refresh") @HttpCode(200) async refresh(
    @Req() r: FastifyRequest,
    @Res({ passthrough: true }) s: FastifyReply,
  ) {
    await this.transport.checkUnsafe(r);
    await this.transport.admit(r, "write");
    return this.transport.session(s, await this.identity.refresh(this.transport.refresh(r), r.id));
  }
  @Post("auth/logout") @HttpCode(200) async logout(
    @Req() r: FastifyRequest,
    @Res({ passthrough: true }) s: FastifyReply,
  ) {
    await this.transport.checkUnsafe(r, "logout");
    await this.transport.admit(r, "write");
    await this.identity.logout(this.transport.optionalRefresh(r), r.id);
    this.transport.clear(s);
    return { revoked: true };
  }
  @Get("me") async me(@Req() r: FastifyRequest) {
    const p = await this.identity.authenticate(this.transport.access(r));
    this.identity.requirePermission(p, "identity.self");
    await this.transport.admit(r, "read", p.userId);
    return p.profile;
  }
  @Put("me") async update(@Req() r: FastifyRequest, @Body() value: unknown) {
    await this.transport.checkUnsafe(r);
    const raw = this.transport.access(r),
      p = await this.identity.authenticate(raw);
    await this.transport.admit(r, "write", p.userId);
    const key = r.headers["idempotency-key"];
    if (
      typeof key !== "string" ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(key)
    )
      throw invalidRequest();
    return await this.identity.updateProfile(raw, key, profileInput(value), r.id);
  }
}
