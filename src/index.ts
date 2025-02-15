import { Config } from './types';
import { TypeOrmConstantsGenerator } from './generator/constants.generator';
import { TypeOrmEntitiesGenerator } from './generator/entities.generator';
import { TypeOrmIndexGenerator } from './generator/index.generator';
import { TypeOrmUmlGenerator } from './generator/uml.generator';
import * as fs from 'fs';

export async function generateTypeOrmFiles(config: Config): Promise<void> {
  // Clear existing output
  if (fs.existsSync(config.output.path)) {
    fs.rmSync(config.output.path, { force: true, recursive: true });
  }

  const entityGenerator = new TypeOrmEntitiesGenerator();
  await entityGenerator.initialize();
  entityGenerator.generate(config);

  const constantsGenerator = new TypeOrmConstantsGenerator();
  constantsGenerator.generate(config);

  const indexGenerator = new TypeOrmIndexGenerator();
  indexGenerator.generate(config);

  // const umlGenerator = new TypeOrmUmlGenerator();
  // umlGenerator.generate(config);
}
