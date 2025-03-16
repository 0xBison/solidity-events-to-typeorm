import { Direction, Flags, Format, TypeormUml } from 'typeorm-uml';
import { BaseTypeOrmGenerator } from './generator.interface';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { Config } from '../types';
import chalk from 'chalk';
import { logMessage } from '../utils/loggingUtils';

const typeormUml = new TypeormUml();

export class TypeOrmUmlGenerator extends BaseTypeOrmGenerator {
  public async generate(config: Config): Promise<void> {
    if (!config.docs) {
      // skip docs generation
      return;
    }

    const docsDir = path.resolve(config.output.path, config.docs.path);

    const entitiesDir = path.resolve(
      config.output.path,
      config.output.entities,
    );

    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }

    const files = fs.readdirSync(entitiesDir);

    // Extract unique IDs from filenames
    const idSet = new Set<string>();
    const idPattern = /_(\w+)\.ts$/;

    files.forEach((file) => {
      const match = file.match(idPattern);
      if (match && match[1]) {
        idSet.add(match[1]);
      }
    });

    const flags: Flags = {
      direction: Direction.LR,
      format: Format.PNG,
      handwritten: true,
      'plantuml-url': config.docs.plantUmlServer,
    };

    // Base ormConfig
    const baseOrmConfig = {
      type: 'postgres',
      driver: {
        type: 'pglite',
        options: {
          database: ':memory:',
        },
      },
      synchronize: true,
      logging: false,
    };

    // Prepare promises for each unique ID
    const promises = Array.from(idSet).map(async (id) => {
      const pattern = path.join(entitiesDir, `*_${id}.ts`);
      const configFilePath = path.join(entitiesDir, `ormconfig_${id}.json`);

      // Create a specific ormConfig for each ID
      const ormConfig = {
        ...baseOrmConfig,
        entities: [pattern],
      };

      fs.writeFileSync(configFilePath, JSON.stringify(ormConfig, null, 2));

      try {
        const outputFilePath = path.join(docsDir, `uml_${id}.png`);
        await this.generateUmlForEntities(
          configFilePath,
          outputFilePath,
          flags,
        );
      } finally {
        // Delete the ormconfig.json file after UML generation
        fs.unlinkSync(configFilePath);
      }
    });

    // Add promise for all entities
    const allEntitiesPattern = path.join(entitiesDir, '*.ts');
    const allEntitiesConfigFilePath = path.join(
      entitiesDir,
      'ormconfig_all.json',
    );

    const allEntitiesOrmConfig = {
      ...baseOrmConfig,
      entities: [allEntitiesPattern],
    };

    fs.writeFileSync(
      allEntitiesConfigFilePath,
      JSON.stringify(allEntitiesOrmConfig, null, 2),
    );

    promises.push(
      (async () => {
        try {
          const allEntitiesOutputPath = path.join(
            docsDir,
            'uml_all_entities.png',
          );
          await this.generateUmlForEntities(
            allEntitiesConfigFilePath,
            allEntitiesOutputPath,
            flags,
          );
        } finally {
          // Delete the ormconfig_all.json file after UML generation
          fs.unlinkSync(allEntitiesConfigFilePath);
        }
      })(),
    );

    // Execute all promises concurrently
    await Promise.all(promises);
  }

  private async generateUmlForEntities(
    configPath: string,
    outputPath: string,
    flags: Flags,
  ): Promise<void> {
    try {
      const url = await typeormUml.build(configPath, flags);
      const response = await fetch(url);
      const buffer = await response.buffer();
      fs.writeFileSync(outputPath, buffer);
      logMessage(chalk.green('Diagram saved to:', outputPath));
    } catch (error) {
      console.error('Error generating UML:', error);
    }
  }
}
