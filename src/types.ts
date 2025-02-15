import { JsonFragment, ParamType } from '@ethersproject/abi';
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions';

export interface ContractEventDetails {
  eventName: string;
  topic: string; // ethereum event topic
  compressedTopic: string; // xxhash of hashedSignature
  inputs: Array<ParamType>;
}

export interface ContractInfo {
  abi: JsonFragment[];
  contractName: string;
}

export interface ContractDetails {
  contractName: string;
  events: ContractEventDetails[];
}

export interface TopicDetails {
  eventName: string;
  contractNames: Array<string>;
}

export interface Config {
  output: {
    path: string;
    entities: string;
    abis: string; // New: Path for ABI output
    eventTopicList: string; // New: Path for event topic list output
  };
  artifacts: {
    include: string[];
    exclude: string[];
  };
  contractMappings?: {
    [originalContract: string]: string[];
  };
  // Optional: Add generator-specific config sections if needed
  typeOrm?: {
    // TypeORM specific settings
    namingStrategy?: string;
  };
}
