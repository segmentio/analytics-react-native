import { createLogger, Logger } from '../logger';

describe('#createLogger', () => {
  it('create a new logger', () => {
    const logger = createLogger();
    expect(logger).toBeInstanceOf(Logger);
  });
});

describe('Logger', () => {
  it('create a new logger instance', () => {
    const logger = new Logger();

    expect(logger.isDisabled).toBeFalsy();
  });

  it('create a new logger instance in production', () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const logger = new Logger();

    expect(logger.isDisabled).toBe(true);

    process.env.NODE_ENV = previousNodeEnv;
  });

  it('enables the logger', () => {
    const logger = new Logger(true);
    expect(logger.isDisabled).toBe(true);
    logger.enable();
    expect(logger.isDisabled).toBeFalsy();
  });

  it('disables the logger', () => {
    const logger = new Logger();
    expect(logger.isDisabled).toBeFalsy();
    logger.disable();
    expect(logger.isDisabled).toBe(true);
  });

  it('logs an info message - enabled logger', () => {
    jest.spyOn(global.console, 'info').mockImplementationOnce(() => {});
    const logger = new Logger(false);
    logger.info('Hello world');
    expect(console.info).toHaveBeenCalledWith('Hello world');
  });

  it('logs an info message - disabled logger', () => {
    jest.spyOn(global.console, 'info').mockImplementationOnce(() => {});
    const logger = new Logger(true);
    logger.info('Hello world');
    expect(console.info).not.toHaveBeenCalledWith();
  });

  it('logs a warn message - enabled logger', () => {
    jest.spyOn(global.console, 'warn').mockImplementationOnce(() => {});
    const logger = new Logger(false);
    logger.warn('Hello world');
    expect(console.warn).toHaveBeenCalledWith('Hello world');
  });

  it('logs a warn message - disabled logger', () => {
    jest.spyOn(global.console, 'warn').mockImplementationOnce(() => {});
    const logger = new Logger(true);
    logger.warn('Hello world');
    expect(console.warn).not.toHaveBeenCalledWith();
  });

  it('logs an error message - enabled logger', () => {
    jest.spyOn(global.console, 'error').mockImplementationOnce(() => {});
    const logger = new Logger(false);
    logger.error('Hello world');
    expect(console.error).toHaveBeenCalledWith('Hello world');
  });

  it('logs an error message - disabled logger', () => {
    jest.spyOn(global.console, 'error').mockImplementationOnce(() => {});
    const logger = new Logger(true);
    logger.error('Hello world');
    expect(console.error).not.toHaveBeenCalledWith();
  });
});
