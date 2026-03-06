import type { DeactivableLoggerType } from './types';

export class Logger implements DeactivableLoggerType {
  isDisabled: boolean;

  constructor(isDisabled: boolean = process.env.NODE_ENV === 'production') {
    this.isDisabled = isDisabled;
  }

  enable() {
    this.isDisabled = false;
  }

  disable() {
    this.isDisabled = true;
  }

  info(message?: unknown, ...optionalParams: unknown[]): void {
    if (!this.isDisabled) {
      console.info(message, ...optionalParams);
    }
  }

  warn(message?: unknown, ...optionalParams: unknown[]): void {
    if (!this.isDisabled) {
      console.warn(message, ...optionalParams);
    }
  }

  error(message?: unknown, ...optionalParams: unknown[]): void {
    if (!this.isDisabled) {
      console.error(message, ...optionalParams);
    }
  }
}

export const createLogger = (isDisabled?: boolean) => new Logger(isDisabled);
