import { IContainer } from '@domain/interface/container.interface';
import { ApplicationError } from './error.implementation';

/**
 * Simple dependency injection container implementation.
 */
export class Container implements IContainer {
  private dependencies: Map<string, any>;
  
  /**
   * Create a new container.
   */
  constructor() {
    this.dependencies = new Map();
  }
  
  /**
   * Register a dependency in the container.
   * @param token Token that identifies the dependency.
   * @param implementation Implementation of the dependency.
   */
  public register<T>(token: string, implementation: T): void {
    this.dependencies.set(token, implementation);
  }
  
  /**
   * Get a dependency from the container.
   * @param token Token that identifies the dependency.
   * @returns The dependency, or undefined if it doesn't exist.
   */
  public get<T>(token: string): T | undefined {
    return this.dependencies.get(token) as T | undefined;
  }
  
  /**
   * Get a dependency from the container, throwing an error if it doesn't exist.
   * @param token Token that identifies the dependency.
   * @returns The dependency.
   * @throws Error if the dependency doesn't exist.
   */
  public getRequired<T>(token: string): T {
    const dependency = this.get<T>(token);
    
    if (!dependency) {
      throw new ApplicationError(
        `Dependency not found: ${token}`,
        'DEPENDENCY_NOT_FOUND'
      );
    }
    
    return dependency;
  }
  
  /**
   * Check if a dependency exists in the container.
   * @param token Token that identifies the dependency.
   * @returns True if the dependency exists, false otherwise.
   */
  public has(token: string): boolean {
    return this.dependencies.has(token);
  }
  
  /**
   * Remove a dependency from the container.
   * @param token Token that identifies the dependency.
   */
  public remove(token: string): void {
    this.dependencies.delete(token);
  }
  
  /**
   * Clear all dependencies from the container.
   */
  public clear(): void {
    this.dependencies.clear();
  }
}
