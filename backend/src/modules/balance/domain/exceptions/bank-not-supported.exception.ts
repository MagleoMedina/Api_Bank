export class BankNotSupportedException extends Error {
  constructor(bankId: string, availableBanks: string[]) {
    super(
      `El banco "${bankId}" no está registrado. Bancos disponibles: ${availableBanks.join(', ') || '(ninguno)'}.`,
    );
    this.name = 'BankNotSupportedException';
  }
}