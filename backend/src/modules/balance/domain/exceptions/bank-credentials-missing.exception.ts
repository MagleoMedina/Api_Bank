export class BankCredentialsMissingException extends Error {
  constructor(bankId: string) {
    super(
      `Faltan credenciales para el banco "${bankId}". Configura las variables de entorno correspondientes en .env (ver .env.example).`,
    );
    this.name = 'BankCredentialsMissingException';
  }
}