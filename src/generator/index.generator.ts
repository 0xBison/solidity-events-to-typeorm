import { writeFileSync } from 'fs';
import path from 'path';
import glob from 'glob';
import { generateWarning } from '../utils/generateWarning';
import { TransformedConfig } from '../types';
import { BaseTypeOrmGenerator } from './generator.interface';
import chalk from 'chalk';
import { logMessage } from '../utils/loggingUtils';

export class TypeOrmIndexGenerator extends BaseTypeOrmGenerator {
  public generate(config: TransformedConfig): void {
    logMessage(chalk.blue('Index file generating...'));

    const entitiesPath = path.join(config.output.path, 'entities');
    const entities = glob.sync(path.join(entitiesPath, '**.ts'));

    const entitiesIndexContents = entities
      .map((entity) => {
        const match = entity.match(/([^/]+)\.ts$/);
        if (!match) {
          console.warn(`Could not parse entity name from path: ${entity}`);
          return '';
        }
        const entityName = match[1];
        return `export { ${entityName} } from "./${entityName}";`;
      })
      .filter((line) => line !== '')
      .join('\n');

    const indexFileContents = `${generateWarning()}\n${entitiesIndexContents}\n`;

    writeFileSync(path.join(entitiesPath, 'index.ts'), indexFileContents);

    logMessage(chalk.green('Index file generated successfully'));
  }
}
