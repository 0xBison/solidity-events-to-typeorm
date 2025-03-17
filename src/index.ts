import { Config } from './types';
import { TypeOrmConstantsGenerator } from './generator/constants.generator';
import { TypeOrmEntitiesGenerator } from './generator/entities.generator';
import { TypeOrmIndexGenerator } from './generator/index.generator';
import { TypeOrmUmlGenerator } from './generator/uml.generator';
import * as fs from 'fs';
import { lintFiles } from './utils/lint';
import { TypeOrmBlockchainEntityGenerator } from './generator/blockchain-entity.generator';
import { TypeOrmMigrationGenerator } from './generator/migration.generator';
import { logMessage } from './utils/loggingUtils';
import path from 'path';
import callsite from 'callsite';

export async function generateTypeOrmFiles(config: Config): Promise<void> {
  if (config.enableLogging) {
    process.env.LOGGING_ENABLED = 'true';
  }

  const stack = callsite();
  // The caller is usually the second item in the stack
  const caller = stack[1];
  const callerFile = caller.getFileName().split('/').slice(0, -1).join('/');

  const outputPath = path.resolve(callerFile, config.output.path);

  // Normalize all paths to be absolute relative to project root
  const normalizedConfig = {
    ...config,
    output: { ...config.output, path: outputPath },
  };

  // Log the resolved output path
  logMessage(`Files will be created at: ${normalizedConfig.output.path}`);

  // Clear existing output
  if (fs.existsSync(normalizedConfig.output.path)) {
    fs.rmSync(normalizedConfig.output.path, { force: true, recursive: true });
  }

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
