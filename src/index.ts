import { Config, Contracts, ContractInfo, TransformedConfig } from './types';
import { TypeOrmConstantsGenerator } from './generator/constants.generator';
import { TypeOrmEntitiesGenerator } from './generator/entities.generator';
import { TypeOrmIndexGenerator } from './generator/index.generator';
import { TypeOrmUmlGenerator } from './generator/uml.generator';
import { lintFiles } from './utils/lint';
import { TypeOrmBlockchainEntityGenerator } from './generator/blockchain-entity.generator';
import { TypeOrmMigrationGenerator } from './generator/migration.generator';
import { logMessage } from './utils/loggingUtils';
import path from 'path';

function transformConfig(config: Config): TransformedConfig {
  const { contracts, ...rest } = config;

  const contractInfo: ContractInfo[] = Object.entries(contracts).map(
    ([key, value]) => {
      return {
        contractName: key,
        // filterEvents if there is a filter specified
        abi: value.filterEvents ? value.filterEvents(value.abi) : value.abi,
      };
    },
  );

  return {
    ...rest,
    contracts: contractInfo,
  };
}

interface ConfigPath {
  property: string;
  name: string;
}

function validateConfig(config: TransformedConfig): TransformedConfig {
  const configPaths: ConfigPath[] = [
    { property: 'output.path', name: 'output' },
    { property: 'output.entities', name: 'entities' },
    { property: 'output.abis', name: 'abis' },
    { property: 'migrations.path', name: 'migrations' },
    { property: 'docs.path', name: 'docs' },
  ];

  for (const configPath of configPaths) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const property = config[configPath.property];
    if (property && !path.isAbsolute(property)) {
      throw new Error(`${configPath.name} path must be absolute`);
    }
  }

  // Log the resolved output path
  logMessage(`Files will be created at: ${config.output.path}`);

  return config;
}

export async function generate(config: Config): Promise<void> {
  if (config.enableLogging) {
    process.env.LOGGING_ENABLED = 'true';
  }

  const oldConfig = transformConfig(config);
  const normalizedConfig = validateConfig(oldConfig);

  const blockchainEntityGenerator = new TypeOrmBlockchainEntityGenerator();
  blockchainEntityGenerator.generate(normalizedConfig);

  const entityGenerator = new TypeOrmEntitiesGenerator();
  await entityGenerator.initialize();
  entityGenerator.generate(normalizedConfig);

  const constantsGenerator = new TypeOrmConstantsGenerator();
  constantsGenerator.generate(normalizedConfig);

  const indexGenerator = new TypeOrmIndexGenerator();
  indexGenerator.generate(normalizedConfig);

  const migrationGenerator = new TypeOrmMigrationGenerator();
  migrationGenerator.generate(normalizedConfig);

  const umlGenerator = new TypeOrmUmlGenerator();
  umlGenerator.generate(normalizedConfig);

  await lintFiles();
}

export { Config, Contracts };
