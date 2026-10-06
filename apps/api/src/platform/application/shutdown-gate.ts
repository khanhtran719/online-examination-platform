export class ShutdownGate {
  private draining = false;

  drain(): void {
    this.draining = true;
  }

  isDraining(): boolean {
    return this.draining;
  }
}
