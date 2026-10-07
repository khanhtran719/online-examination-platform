export interface StoredReceipt<T> {
  fingerprint: Uint8Array;
  response: T;
  httpStatus: number;
}

export interface IdempotencyStore {
  find<T>(actorId: string, key: string): Promise<StoredReceipt<T> | null>;
  save(input: {
    actorId: string;
    key: string;
    fingerprint: Uint8Array;
    operation: string;
    resourceId: string;
    httpStatus: number;
    response: object;
  }): Promise<void>;
}
