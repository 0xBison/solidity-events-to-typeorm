import CounterArtifact from './input/counter.json';
import { generate } from '../../src';
import { Config } from '../../src/types';
import path from 'path';

const outputPath = path.resolve(__dirname, './output/');

export const config: Config = {
  output: {
    // make sure this is an absolute path
    path: outputPath,
    entities: path.resolve(outputPath, 'entities/'),
    abis: path.resolve(outputPath, 'abis/'),
  },

  migrations: {
    path: path.resolve(outputPath, 'migrations/'),
    migrationName: 'CounterMigrations',
    schemaName: 'test',
  },

  docs: {
    path: path.resolve(outputPath, 'docs/'),
  },

  contracts: {
    Counter: {
      abi: CounterArtifact.abi,
    },
  },
};

generate(config).catch((err) => {
  console.error('Fatal error during generation:', err);
  process.exit(1);
});
