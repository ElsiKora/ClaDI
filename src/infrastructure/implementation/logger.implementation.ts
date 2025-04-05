import { ELogLevel, ILogger } from '@domain/interface/logger.interface';

/**
 * Console logger implementation.
 */
export class ConsoleLogger implements ILogger {
  /**
   * Current log level. Messages below this level will not be logged.
   */
  private level: ELogLevel;

  /**
   * Create a new console logger.
   * @param level Log level to use. Defaults to INFO.
   */
  constructor(level: ELogLevel = ELogLevel.INFO) {
    this.level = level;
  }

  /**
   * Check if the given level should be logged.
   * @param level Level to check.
   * @returns True if the level should be logged.
   */
  private shouldLog(level: ELogLevel): boolean {
    const levels = [
      ELogLevel.ERROR,
      ELogLevel.WARN,
      ELogLevel.INFO,
      ELogLevel.DEBUG,
      ELogLevel.TRACE
    ];
    
    return levels.indexOf(level) <= levels.indexOf(this.level);
  }

  /**
   * Format a message for logging.
   * @param level Log level.
   * @param message Message to log.
   * @param context Optional context to include.
   * @returns Formatted message.
   */
  private formatMessage(level: ELogLevel, message: string, context?: Record<string, unknown>): string {
    const timestamp = new Date().toISOString();
    const formattedContext = context ? ` ${JSON.stringify(context)}` : '';
    
    return `[${timestamp}] ${level.toUpperCase()}: ${message}${formattedContext}`;
  }

  /**
   * Log an error message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  public error(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(ELogLevel.ERROR)) {
      console.error(this.formatMessage(ELogLevel.ERROR, message, context));
    }
  }

  /**
   * Log a warning message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  public warn(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(ELogLevel.WARN)) {
      console.warn(this.formatMessage(ELogLevel.WARN, message, context));
    }
  }

  /**
   * Log an info message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  public info(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(ELogLevel.INFO)) {
      console.info(this.formatMessage(ELogLevel.INFO, message, context));
    }
  }

  /**
   * Log a debug message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  public debug(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(ELogLevel.DEBUG)) {
      console.debug(this.formatMessage(ELogLevel.DEBUG, message, context));
    }
  }

  /**
   * Log a trace message.
   * @param message Message to log.
   * @param context Optional context to include with the log.
   */
  public trace(message: string, context?: Record<string, unknown>): void {
    if (this.shouldLog(ELogLevel.TRACE)) {
      console.trace(this.formatMessage(ELogLevel.TRACE, message, context));
    }
  }
}
