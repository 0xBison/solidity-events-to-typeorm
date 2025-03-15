import { DataSource } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { PGliteDriver } from 'typeorm-pglite';
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';

// Function to generate schema-aware migration files
export async function generateSchemaAwareMigrations(
  entityPaths: string[],
  outputDir: string,
  name: string,
  schemaName = 'blockchain_events',
) {
  // Create a temporary DataSource using PGlite
  const dataSource = new DataSource({
    type: 'postgres', // Use postgres type
    driver: new PGliteDriver().driver, // Use PGlite driver
    synchronize: false,
    logging: false,
    entities: entityPaths,
    namingStrategy: new SnakeNamingStrategy(),
  });

  try {
    // Initialize the data source
    await dataSource.initialize();
    console.log('PGlite DataSource initialized successfully');

    // Generate the migration
    const sqlInMemory = await dataSource.driver.createSchemaBuilder().log();

    // Process up queries to make them schema-aware
    const upQueries = sqlInMemory.upQueries.map((q) => {
      // Replace any direct table references to include schema
      let query = q.query.replace(
        /CREATE TABLE "([^"]+)"/g,
        `CREATE TABLE "${schemaName}"."$1"`,
      );

      // Adjust ALTER TABLE references
      query = query.replace(
        /ALTER TABLE( ONLY)? "([^"]+)"/g,
        `ALTER TABLE$1 "${schemaName}"."$2"`,
      );

      return query;
    });

    // Process down queries to make them schema-aware
    const downQueries = sqlInMemory.downQueries.map((q) => {
      // Replace DROP TABLE statements
      const query = q.query.replace(
        /DROP TABLE "([^"]+)"/g,
        `DROP TABLE IF EXISTS "${schemaName}"."$1" CASCADE`,
      );

      return query;
    });

    // Create migration content
    const timestamp = new Date().getTime();
    const className = `${name}${timestamp}`;
    const content = `
import { MigrationInterface, QueryRunner } from "typeorm";

export class ${className} implements MigrationInterface {
  name = '${className}';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create schema if it doesn't exist
    await queryRunner.query(\`CREATE SCHEMA IF NOT EXISTS "${schemaName}"\`);
    
${upQueries
  .map((query) => `    await queryRunner.query(\`${query}\`);`)
  .join('\n\n')}
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
${downQueries
  .map((query) => `    await queryRunner.query(\`${query}\`);`)
  .join('\n\n')}
  }
}`;

    // Ensure output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the migration file
    const filePath = path.join(outputDir, `${timestamp}-${name}.ts`);
    fs.writeFileSync(filePath, content);

    console.log(`Schema-aware migration generated at: ${filePath}`);
  } finally {
    // Clean up
    if (dataSource.isInitialized) await dataSource.destroy();
  }
}
