import { describe, it, expect } from 'vitest';
import { Container } from '../../src/infrastructure/implementation/container.implementation';
import { ApplicationError } from '../../src/infrastructure/implementation/error.implementation';

describe('Container', () => {
  it('should create a container', () => {
    const container = new Container();
    expect(container).toBeDefined();
  });

  it('should register and get a dependency', () => {
    const container = new Container();
    const dependency = { value: 'test' };
    
    container.register('test', dependency);
    
    expect(container.get('test')).toBe(dependency);
  });

  it('should return undefined when getting a non-existent dependency', () => {
    const container = new Container();
    
    expect(container.get('non-existent')).toBeUndefined();
  });

  it('should throw an error when getting a required non-existent dependency', () => {
    const container = new Container();
    
    expect(() => container.getRequired('non-existent')).toThrow(ApplicationError);
    expect(() => container.getRequired('non-existent')).toThrow('Dependency not found: non-existent');
  });

  it('should check if a dependency exists', () => {
    const container = new Container();
    const dependency = { value: 'test' };
    
    container.register('test', dependency);
    
    expect(container.has('test')).toBe(true);
    expect(container.has('non-existent')).toBe(false);
  });

  it('should remove a dependency', () => {
    const container = new Container();
    const dependency = { value: 'test' };
    
    container.register('test', dependency);
    expect(container.has('test')).toBe(true);
    
    container.remove('test');
    expect(container.has('test')).toBe(false);
  });

  it('should clear all dependencies', () => {
    const container = new Container();
    
    container.register('test1', { value: 'test1' });
    container.register('test2', { value: 'test2' });
    
    expect(container.has('test1')).toBe(true);
    expect(container.has('test2')).toBe(true);
    
    container.clear();
    
    expect(container.has('test1')).toBe(false);
    expect(container.has('test2')).toBe(false);
  });
});
