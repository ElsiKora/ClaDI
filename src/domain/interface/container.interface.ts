/**
 * Simple dependency injection container interface.
 */
export interface IContainer {
  /**
   * Register a dependency in the container.
   * @param token Token that identifies the dependency.
   * @param implementation Implementation of the dependency.
   */
  register<T>(token: string, implementation: T): void;
  
  /**
   * Get a dependency from the container.
   * @param token Token that identifies the dependency.
   * @returns The dependency, or undefined if it doesn't exist.
   */
  get<T>(token: string): T | undefined;
  
  /**
   * Get a dependency from the container, throwing an error if it doesn't exist.
   * @param token Token that identifies the dependency.
   * @returns The dependency.
   * @throws Error if the dependency doesn't exist.
   */
  getRequired<T>(token: string): T;
  
  /**
   * Check if a dependency exists in the container.
   * @param token Token that identifies the dependency.
   * @returns True if the dependency exists, false otherwise.
   */
  has(token: string): boolean;
  
  /**
   * Remove a dependency from the container.
   * @param token Token that identifies the dependency.
   */
  remove(token: string): void;
  
  /**
   * Clear all dependencies from the container.
   */
  clear(): void;
}
