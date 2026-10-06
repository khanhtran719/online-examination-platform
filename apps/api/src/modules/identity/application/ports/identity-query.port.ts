import { SessionLookup } from "../../domain/entities/identity-state";
import { Principal } from "../dto/identity.dto";
export interface IdentityQuery {
  principal(claims: SessionLookup, hash: Uint8Array): Promise<Principal | null>;
  csrfFamily(
    claims: SessionLookup,
    hash: Uint8Array,
    allowRevoked: boolean,
  ): Promise<string | null>;
}
