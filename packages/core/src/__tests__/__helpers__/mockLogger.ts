import { Logger } from '../../logger';

export const getMockLogger = () => {
  const logger = new Logger();
  logger.disable();
  logger.info = jest.fn();
  logger.warn = jest.fn();
  logger.error = jest.fn();
  return logger;
};
