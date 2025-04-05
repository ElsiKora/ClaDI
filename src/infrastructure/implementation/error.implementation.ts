import { IApplicationError } from '@domain/interface/error.interface';

/**
 * Base application error class.
 */
export class ApplicationError extends Error implements IApplicationError {
  /**
   * Creates a new application error.
   * @param message Error message.
   * @param code Error code.
   * @param cause Original error that caused this error, if any.
   * @param context Additional context about the error.
   */
  constructor(
    message: string, 
    public readonly code: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    
    if ((Error as any).captureStackTrace) {
      (Error as any).captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error thrown when an item is not found in a registry.
 */
export class RegistryItemNotFoundError extends ApplicationError {
  /**
   * Creates a new registry item not found error.
   * @param itemName Name of the item that was not found.
   * @param cause Original error that caused this error, if any.
   * @param context Additional context about the error.
   */
  constructor(
    itemName: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      `No item found in registry with name: ${itemName}`,
      'REGISTRY_ITEM_NOT_FOUND',
      cause,
      context
    );
  }
}

/**
 * Error thrown when validation fails.
 */
export class ValidationError extends ApplicationError {
  /**
   * Creates a new validation error.
   * @param message Error message.
   * @param cause Original error that caused this error, if any.
   * @param context Additional context about the error.
   */
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(
      message,
      'VALIDATION_ERROR',
      cause,
      context
    );
  }
}
