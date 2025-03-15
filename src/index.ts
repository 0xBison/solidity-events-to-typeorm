import { Config } from './types';
import { TypeOrmConstantsGenerator } from './generator/constants.generator';
import { TypeOrmEntitiesGenerator } from './generator/entities.generator';
import { TypeOrmIndexGenerator } from './generator/index.generator';
import { TypeOrmUmlGenerator } from './generator/uml.generator';
import * as fs from 'fs';
import { lintFiles } from './utils/lint';
import { TypeOrmBlockchainEntityGenerator } from './generator/blockchain-entity.generator';
import { normalizeConfigPaths } from './utils/pathUtils';

export async function generateTypeOrmFiles(config: Config): Promise<void> {
  // Normalize all paths to be absolute relative to project root
  const normalizedConfig = normalizeConfigPaths(config);

  // Log the resolved output path
  console.log(`Files will be created at: ${normalizedConfig.output.path}`);

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

  // const umlGenerator = new TypeOrmUmlGenerator();
  // umlGenerator.generate(normalizedConfig);

  await lintFiles();
}
