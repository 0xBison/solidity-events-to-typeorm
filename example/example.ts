import { SomeContractArtifact } from 'solidity-event-test-suite';
import { Config } from '../src/types';
import { generateTypeOrmFiles } from '../src';

export const config: Config = {
  output: {
    path: '../output/',
    entities: 'entities/',
    eventTopicList: 'event-topic-list.json',
    abis: 'abis',
  },

  migrations: {
    path: 'migrations/',
    migrationName: 'InitialSchema',
    schemaName: 'public',
  },

  docs: {
    path: 'docs/',
  },

  artifacts: {
    includePaths: [],
    excludePaths: [],
    contractArtifacts: [SomeContractArtifact],
  },
};

async function run() {
  try {
    await generateTypeOrmFiles(config);
  } catch (error) {
    console.error('Error in generation process:', error);
  }
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
