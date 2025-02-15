import { Config } from '../types';

export interface TypeOrmGenerator {
  generate(config: Config): void;
}
