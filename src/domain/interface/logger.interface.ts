/**
 * Log levels.
 */
export enum ELogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  DEBUG = 'debug',
  TRACE = 'trace'
}

/**
 * Logger interface.
 */
export interface ILogger {
  /**
   * Log an error message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  error(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log a warning message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  warn(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log an info message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  info(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log a debug message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  debug(message: string, context?: Record<string, unknown>): void;
  
  /**
   * Log a trace message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  trace(message: string, context?: Record<string, unknown>): void;
}
