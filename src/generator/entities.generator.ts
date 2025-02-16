import * as fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { glob } from 'glob';
import { ethers } from 'ethers';
import xxhash, { XXHashAPI } from 'xxhash-wasm';
import { EventFragment, JsonFragment } from '@ethersproject/abi';
import { pascalCase } from 'pascal-case';
import {
  generateTypeOrmEntity,
  generateTypeOrmEntityName,
} from './entity.generator';
import {
  Config,
  ContractDetails,
  ContractEventDetails,
  ContractInfo,
  TopicDetails,
} from '../types';
import { TypeOrmGenerator } from './generator.interface';
import { TypeOrmBlockchainEntityGenerator } from './blockchain-entity.generator';
import { writeFileToLint } from '../utils/lint';

/**
 * Generator for creating TypeORM entities from smart contract events.
 * Processes contract ABIs and generates corresponding entity classes.
 */
export class TypeOrmEntitiesGenerator implements TypeOrmGenerator {
  private xxHashInstance: XXHashAPI | null = null;

  /**
   * Initializes the generator by setting up the xxHash instance
   * @throws Error if xxHash initialization fails
   */
  public async initialize(): Promise<void> {
    this.xxHashInstance = await xxhash();
  }

  /**
   * Main generation method that orchestrates the entity generation process
   * @param config Configuration object containing paths and settings
   */
  public generate(config: Config): void {
    if (!this.xxHashInstance) {
      throw new Error('Generator not initialized. Call initialize() first.');
    }

    const entitiesPath = path.join(config.output.path, config.output.entities);
    const artifactPaths = this.getArtifactPaths(config);
    const contracts = this.processArtifacts(artifactPaths, config);

    this.generateEntities(contracts, entitiesPath);
  }

  // File Processing Methods
  /**
   * Resolves artifact paths from config, handling both direct file paths and glob patterns
   * @param config Configuration object
   * @returns Array of resolved file paths
   * @private
   */
  private getArtifactPaths(config: Config): string[] {
    return glob.sync(`{${config.artifacts.include.join(',')}}`, {
      ignore: config.artifacts.exclude,
    });
  }

  /**
   * Extracts contract information from an artifact file
   * @param artifactPath Path to the contract artifact
   * @returns Contract information including ABI and name
   * @private
   */
  private getContractInfoFromPath(artifactPath: string): ContractInfo {
    const pathComponents = artifactPath.split('/');

    const contractName = pathComponents[pathComponents.length - 1].replace(
      '.json',
      '',
    );

    const abi = JSON.parse(fs.readFileSync(artifactPath, 'utf-8'));

    return { abi, contractName };
  }

  // Contract Processing Methods
  /**
   * Processes all artifacts and generates contract details
   * @param artifactPaths Array of paths to contract artifacts
   * @param config Configuration object
   * @returns Array of processed contract details
   * @private
   */
  private processArtifacts(
    artifactPaths: string[],
    config: Config,
  ): ContractDetails[] {
    const topicsToContracts = new Map<string, TopicDetails>();
    const contracts: ContractDetails[] = [];

    for (const artifactPath of artifactPaths) {
      const contractInfo = this.getContractInfoFromPath(artifactPath);
      const contractDetails = this.processContractABI(
        contractInfo,
        topicsToContracts,
        config,
      );
      contracts.push(contractDetails);
    }

    this.writeTopicList(topicsToContracts, config);
    return contracts;
  }

  /**
   * Processes a contract's ABI to extract event details
   * @param contractInfo Contract information including ABI
   * @param topicsToContracts Map to track topics across contracts
   * @param config Configuration object
   * @returns Processed contract details
   * @private
   */
  private processContractABI(
    contractInfo: ContractInfo,
    topicsToContracts: Map<string, TopicDetails>,
    config: Config,
  ): ContractDetails {
    const contractInterface = new ethers.utils.Interface(contractInfo.abi);
    const events = this.extractEventDetails(
      contractInfo.abi,
      contractInterface,
    );

    this.writeContractABI(contractInfo, config);
    this.updateTopicsMapping(
      events,
      contractInfo.contractName,
      topicsToContracts,
      config,
    );

    return {
      contractName: contractInfo.contractName,
      events,
    };
  }

  /**
   * Extracts event details from contract ABI
   * @param abi Contract ABI
   * @param contractInterface Ethers contract interface
   * @returns Array of contract event details
   * @private
   */
  private extractEventDetails(
    abi: JsonFragment[],
    contractInterface: ethers.utils.Interface,
  ): ContractEventDetails[] {
    return abi
      .filter((item: JsonFragment) => item.type === 'event')
      .map((item: JsonFragment) => <EventFragment>item)
      .map((item: EventFragment): ContractEventDetails => {
        const topic = contractInterface.getEventTopic(item.name);
        return {
          eventName: item.name,
          topic,
          // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          compressedTopic: this.xxHashInstance!.h32ToString(topic),
          inputs: item.inputs,
        };
      });
  }

  // File Writing Methods
  /**
   * Writes contract ABI to output directory
   * @param contractInfo Contract information
   * @param config Configuration object
   * @private
   */
  private writeContractABI(contractInfo: ContractInfo, config: Config): void {
    const abisOutputDir = path.join(config.output.path, config.output.abis);
    mkdirp.sync(abisOutputDir);

    const contractNames = this.getContractNames(
      contractInfo.contractName,
      config,
    );

    for (const name of contractNames) {
      fs.writeFileSync(
        path.join(abisOutputDir, `${name}.json`),
        JSON.stringify(contractInfo.abi, null, 2),
      );
    }
  }

  /**
   * Writes topic list to output file
   * @param topicsToContracts Map of topics to contract details
   * @param config Configuration object
   * @private
   */
  private writeTopicList(
    topicsToContracts: Map<string, TopicDetails>,
    config: Config,
  ): void {
    fs.writeFileSync(
      path.join(config.output.path, config.output.eventTopicList),
      JSON.stringify(Object.fromEntries(topicsToContracts), null, 2),
    );
  }

  /**
   * Updates the topics to contracts mapping
   * @param events Array of contract event details
   * @param contractName Name of the contract
   * @param topicsToContracts Map to update
   * @param config Configuration object
   * @private
   */
  private updateTopicsMapping(
    events: ContractEventDetails[],
    contractName: string,
    topicsToContracts: Map<string, TopicDetails>,
    config: Config,
  ): void {
    for (const event of events) {
      const contractNames = this.getContractNames(contractName, config);

      if (topicsToContracts.has(event.topic)) {
        topicsToContracts
          .get(event.topic)
          ?.contractNames.push(...contractNames);
      } else {
        topicsToContracts.set(event.topic, {
          eventName: event.eventName,
          contractNames,
        });
      }
    }
  }

  /**
   * Gets all contract names including mappings from config
   * @param contractName Original contract name
   * @param config Configuration object
   * @returns Array of contract names
   * @private
   */
  private getContractNames(contractName: string, config: Config): string[] {
    if (!config.contractMappings?.[contractName]) {
      return [contractName];
    }
    return config.contractMappings[contractName];
  }

  // Entity Generation Methods
  /**
   * Generates all entity files for the processed contracts
   * @param contracts Array of contract details
   * @param entitiesPath Output path for entities
   * @private
   */
  private generateEntities(
    contracts: ContractDetails[],
    entitiesPath: string,
  ): void {
    mkdirp.sync(entitiesPath);

    const blockchainEntityGenerator = new TypeOrmBlockchainEntityGenerator();
    const blockchainEntity = blockchainEntityGenerator.generate();

    // Generate base blockchain event entity
    writeFileToLint(
      path.join(entitiesPath, 'BlockchainEventEntity.ts'),
      blockchainEntity,
    );

    // Generate specific event entities
    for (const contract of contracts) {
      for (const event of contract.events) {
        const { eventName, compressedTopic, inputs } = event;

        const entityName = generateTypeOrmEntityName(
          eventName,
          compressedTopic,
        );

        const typeOrmEntity = generateTypeOrmEntity(
          eventName,
          compressedTopic,
          inputs,
        );

        writeFileToLint(
          path.join(entitiesPath, `${entityName}.ts`),
          typeOrmEntity,
        );
      }
    }
  }
}
