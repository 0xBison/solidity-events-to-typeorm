// File is from the following dependency but copied to an input folder for viewing in github
// import { SomeContractArtifact } from 'solidity-event-test-suite';
import SomeContractArtifact from './input/SomeContractArtifact.json';
import { Config } from '../../src/types';
import { generate } from '../../src';
import path from 'path';

const outputPath = path.resolve(__dirname, './output/');

export const config: Config = {
  output: {
    path: outputPath,
    entities: path.resolve(outputPath, 'entities/'),
    abis: path.resolve(outputPath, 'abis/'),
  },

  migrations: {
    path: path.resolve(outputPath, 'migrations/'),
    migrationName: 'InitialSchema',
    schemaName: 'public',
  },

  docs: {
    path: path.resolve(outputPath, 'docs/'),
  },

  contracts: {
    SomeContract: {
      abi: SomeContractArtifact.abi,
    },
  },
};

generate(config).catch((err) => {
  console.error('Fatal error during generation:', err);
  process.exit(1);
});
