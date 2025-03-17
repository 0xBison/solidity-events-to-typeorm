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

export interface Config {
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
  };
  artifacts: {
    contractArtifacts: ContractInfo[];
    filterEvents?: (contract: ContractInfo) => ContractInfo;
  };
  contractMappings?: {
    [originalContract: string]: string[];
  };
  enableLogging?: boolean;
}
