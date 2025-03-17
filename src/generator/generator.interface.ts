import { TransformedConfig } from '../types';
import path from 'path';

export interface TypeOrmGenerator {
  generate(config: TransformedConfig): void;
}

/**
 * Base class that ensures consistent path resolution across all generators
 */
export abstract class BaseTypeOrmGenerator implements TypeOrmGenerator {
  /**
   * Resolves a path relative to the caller's directory
   */
  protected resolvePath(basePath: string, relativePath: string): string {
    if (path.isAbsolute(relativePath)) {
      return relativePath;
    }
    return path.resolve(basePath, relativePath);
  }

  /**
   * Implementation required by subclasses
   */
  abstract generate(config: TransformedConfig): void;
}
