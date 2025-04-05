import { describe, it, expect, vi } from 'vitest';
import { ConsoleLogger } from '../../src/infrastructure/implementation/logger.implementation';
import { ELogLevel } from '../../src/domain/interface/logger.interface';

describe('ConsoleLogger', () => {
  it('should create a logger with default log level', () => {
    const logger = new ConsoleLogger();
    expect(logger).toBeDefined();
  });

  it('should create a logger with custom log level', () => {
    const logger = new ConsoleLogger(ELogLevel.DEBUG);
    expect(logger).toBeDefined();
  });

  it('should log error messages', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    
    logger.error('Test error message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('ERROR: Test error message');
    
    consoleSpy.mockRestore();
  });

  it('should log warn messages', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    
    logger.warn('Test warn message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('WARN: Test warn message');
    
    consoleSpy.mockRestore();
  });

  it('should log info messages', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    
    logger.info('Test info message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('INFO: Test info message');
    
    consoleSpy.mockRestore();
  });

  it('should not log debug messages when level is INFO', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = new ConsoleLogger(ELogLevel.INFO);
    
    logger.debug('Test debug message');
    
    expect(consoleSpy).not.toHaveBeenCalled();
    
    consoleSpy.mockRestore();
  });

  it('should log debug messages when level is DEBUG', () => {
    const consoleSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
    const logger = new ConsoleLogger(ELogLevel.DEBUG);
    
    logger.debug('Test debug message');
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('DEBUG: Test debug message');
    
    consoleSpy.mockRestore();
  });

  it('should include context in log messages', () => {
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    const logger = new ConsoleLogger();
    const context = { userId: 123, action: 'login' };
    
    logger.info('User action', context);
    
    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0][0]).toContain('INFO: User action');
    expect(consoleSpy.mock.calls[0][0]).toContain(JSON.stringify(context));
    
    consoleSpy.mockRestore();
  });
});
