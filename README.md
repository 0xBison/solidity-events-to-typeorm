# solidity-events-to-typeorm

A tool that generates TypeORM entities from Ethereum Solidity event ABIs. This library helps you build blockchain indexers by automatically creating the database entities needed to store event data.

## Features

- Automatically generate TypeORM entities from Solidity contract ABIs
- Support for complex data structures including nested objects and arrays
- TypeORM migrations generation for easy database setup
- UML diagram generation for visualizing entity relationships
- Handles all Solidity data types with appropriate TypeORM column types

## Installation

```bash
npm install solidity-events-to-typeorm
```

## Usage

1. Create a configuration file for your project:

```typescript
import { Config } from 'solidity-events-to-typeorm';
import path from 'path';
import MyContractArtifact from './path/to/MyContract.json';

const outputPath = path.resolve(__dirname, './output/');

export const config: Config = {
  output: {
    path: outputPath,
    entities: path.resolve(outputPath, 'entities/'),
    abis: path.resolve(outputPath, 'abis/'),
  },
  contracts: {
    MyContract: {
      abi: MyContractArtifact.abi,
    },
  },
};
```

2. Run the generation script:

```typescript
import { generate } from 'solidity-events-to-typeorm';
import { config } from './config';

generate(config).catch((err) => {
  console.error('Fatal error during generation:', err);
  process.exit(1);
});
```

## Configuration Options

The configuration object supports the following options:

```typescript
interface Config {
  // Required: Contract ABIs to process
  contracts: {
    [contractName: string]: {
      abi: ABI; // Solidity ABI
      filterEvents?: (abi: ABI) => ABI; // Optional function to filter out unwanted events
    };
  };
  
  // Required: Output paths
  output: {
    path: string; // Base output directory
    entities: string; // Path for generated entities
    abis: string; // Path for processed ABIs
  };
  
  // Optional: Documentation generation
  docs?: {
    path: string; // Path for generated documentation
    plantUmlServer?: string; // Optional PlantUML server URL
  };
  
  // Optional: Migration generation
  migrations?: {
    path: string; // Path for generated migrations
    migrationName: string; // Name of the migration class
    schemaName: string; // Database schema name or env variable name
    schemaVariable?: boolean; // When true, schemaName is treated as an env variable name
  };
  
  // Optional: Enable logging during generation
  enableLogging?: boolean;
}
```

## Generated Output

The tool generates the following files:

### Entities

For each event in the Solidity ABI, the tool generates:

1. A main event entity class that extends `BlockchainEventEntity`
2. Related entity classes for nested structures or arrays
3. An `index.ts` file that exports all generated entities

All entities include TypeORM decorators and appropriate column types for Solidity data types.

### Base Entity

All generated event entities inherit from the `BlockchainEventEntity` base class, which includes common blockchain event fields:

- `uniqueEventId`: A unique identifier for the event
- `eventOriginAddress`: The contract address that emitted the event
- `blockHash`, `blockNumber`, `blockTimestamp`: Information about the block
- `transactionHash`, `txIndex`, `logIndex`: Transaction details
- `topics`, `logData`: Raw event data

### Migrations

If the `migrations` option is configured, the tool generates TypeORM migration files that:

1. Create tables for all entities
2. Define foreign key relationships

#### Migrations Configuration

The migrations configuration supports dynamic schema names through environment variables:

```typescript
migrations?: {
  path: string;           // Path for generated migrations
  migrationName: string;  // Name of the migration class
  schemaName: string;     // Database schema name or env variable name
  schemaVariable?: boolean; // When true, schemaName is treated as an env variable name
};
```

#### Using Environment Variables for Schema Names

You can use environment variables for schema names by setting `schemaVariable: true` in your configuration:

```typescript
migrations: {
  path: path.resolve(outputPath, 'migrations/'),
  migrationName: 'MyMigrations',
  schemaName: 'SQL_SCHEMA', // Name of the environment variable
  schemaVariable: true,     // Treat schemaName as an env variable
}
```

When `schemaVariable` is set to `true`:
- The migration generator treats `schemaName` as the name of an environment variable
- Generated migrations will use `${process.env.SQL_SCHEMA}` instead of a hardcoded schema name
- This allows you to deploy the same migrations to different environments with different schema names

If `schemaVariable` is omitted or set to `false` (default), `schemaName` is used as a literal schema name in the generated migrations.

### Documentation

If the `docs` option is configured, the tool generates UML diagrams to visualize the entity relationships. It is recommended you run your own plant uml server if running this for a lot of entities as i've noticed the official server url doesnt return responses if you do a lot of requests at once (which the package will do). You can do that through the docker-compose file.

## Examples

### Simple Example (Counter)

```typescript
import CounterArtifact from './counter.json';
import { generate, Config } from 'solidity-events-to-typeorm';
import path from 'path';

const outputPath = path.resolve(__dirname, './output/');

export const config: Config = {
  output: {
    path: outputPath,
    entities: path.resolve(outputPath, 'entities/'),
    abis: path.resolve(outputPath, 'abis/'),
  },
  contracts: {
    Counter: {
      abi: CounterArtifact.abi,
    },
  },
};

generate(config);
```

### Advanced Example (Complex Structures)

The tool can handle complex Solidity event structures including:

- Dynamic arrays (`uint64[]`)
- Fixed-size arrays (`uint64[3]`)
- Nested structs
- Arrays of structs
- Structs containing arrays

For examples of handling complex structures, see the test suite example in the `examples/test-suite` directory which uses the contract from [solidity-event-test-suite](https://github.com/0xBison/solidity-event-test-suite) to illustrate complex nesting and array types.

## License

MIT