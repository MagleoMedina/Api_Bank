export class BankLoginFailedException extends Error {
  constructor(bankId: string, reason: string) {
    super(`No se pudo iniciar sesión en "${bankId}": ${reason}`);
    this.name = 'BankLoginFailedException';
  }
}