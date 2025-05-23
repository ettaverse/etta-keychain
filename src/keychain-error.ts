export class KeychainError extends Error {
  public params?: any[];

  constructor(message: string, params?: any[]) {
    super(message);
    this.name = 'KeychainError';
    this.params = params;
    Object.setPrototypeOf(this, KeychainError.prototype);
  }
}