/**
 * Standard error interface for all application errors.
 */
export interface IApplicationError extends Error {
  /**
   * Error code to uniquely identify error types.
   */
  code: string;
  
  /**
   * Original error that caused this error, if any.
   */
  cause?: Error;
  
  /**
   * Additional context about the error.
   */
  context?: Record<string, unknown>;
}
