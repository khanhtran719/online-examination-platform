export interface OperatorAdmin {
  apply(
    userId: string,
    actor: string,
    reason: string,
    correlationId: string,
    bootstrap: boolean,
    grant: boolean,
  ): Promise<void>;
}
