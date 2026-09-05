import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { BankCredentialsMissingException } from '../../domain/exceptions/bank-credentials-missing.exception.js';
import { BankLoginFailedException } from '../../domain/exceptions/bank-login-failed.exception.js';
import { BankNotSupportedException } from '../../domain/exceptions/bank-not-supported.exception.js';

@Catch(
  BankCredentialsMissingException,
  BankLoginFailedException,
  BankNotSupportedException,
)
export class BankExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof BankCredentialsMissingException
        ? HttpStatus.UNAUTHORIZED
        : exception instanceof BankLoginFailedException
          ? HttpStatus.BAD_GATEWAY
          : HttpStatus.BAD_REQUEST;

    response.status(status).json({
      statusCode: status,
      message: exception.message,
      error: exception.name,
    });
  }
}