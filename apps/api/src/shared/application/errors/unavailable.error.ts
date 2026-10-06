/** Technical saturation or dependency outage. The HTTP adapter maps this to 503. */
export class UnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
