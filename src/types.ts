import { JsonFragment, ParamType } from '@ethersproject/abi';

export type ABI = JsonFragment[];

export interface ContractEventDetails {
  eventName: string;
  topic: string; // ethereum event topic
  compressedTopic: string; // xxhash of hashedSignature
  inputs: Array<ParamType>;
}

export interface ContractInfo {
  abi: ABI;
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

export interface TransformedConfig {
  contracts: ContractInfo[];
  output: {
    path: string;
    entities: string;
    abis: string; // New: Path for ABI output
  };
  docs?: {
    path: string;
    plantUmlServer?: string;
  };
  migrations?: {
    path: string;
    migrationName: string;
    schemaName: string;
    schemaVariable?: boolean;
  };
  enableLogging?: boolean;
}

export interface Contracts {
  [key: string]: {
    abi: ABI;
    filterEvents?: (abi: ABI) => ABI;
  };
}

export interface Config {
  contracts: Contracts;
  output: {
    path: string;
    entities: string;
    abis: string;
  };
  docs?: {
    path: string;
    plantUmlServer?: string;
  };
  migrations?: {
    path: string;
    migrationName: string;
    schemaName: string;
    schemaVariable?: boolean;
  };
  enableLogging?: boolean;
}
