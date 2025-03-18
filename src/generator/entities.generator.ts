import * as fs from 'fs';
import mkdirp from 'mkdirp';
import path from 'path';
import { ethers } from 'ethers';
import xxhash, { XXHashAPI } from 'xxhash-wasm';
import { EventFragment, JsonFragment } from '@ethersproject/abi';
import {
  generateTypeOrmEntity,
  generateTypeOrmEntityName,
} from './entity.generator';
import {
  TransformedConfig,
  ContractDetails,
  ContractEventDetails,
  ContractInfo,
  TopicDetails,
} from '../types';
import { BaseTypeOrmGenerator } from './generator.interface';
import { writeFileToLint } from '../utils/lint';
import chalk from 'chalk';
import { logMessage } from '../utils/loggingUtils';

/**
 * Generator for creating TypeORM entities from smart contract events.
 * Processes contract ABIs and generates corresponding entity classes.
 */
export class TypeOrmEntitiesGenerator extends BaseTypeOrmGenerator {
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
  public generate(config: TransformedConfig): void {
    logMessage(chalk.blue('Entities generating...'));

    if (!this.xxHashInstance) {
      throw new Error('Generator not initialized. Call initialize() first.');
    }

    const entitiesPath = config.output.entities;
    const contracts = this.processArtifacts(config);

    this.generateEntities(contracts, entitiesPath);

    logMessage(chalk.green('Entities generated successfully'));
  }

  // Contract Processing Methods
  /**
   * Processes all artifacts and generates contract details
   * @param artifactPaths Array of paths to contract artifacts
   * @param config Configuration object
   * @returns Array of processed contract details
   * @private
   */
  private processArtifacts(config: TransformedConfig): ContractDetails[] {
    const topicsToContracts = new Map<string, TopicDetails>();
    const contracts: ContractDetails[] = [];

    // initialize this to the contract artifacts provided
    const contractsToProcess: ContractInfo[] = config.contracts;

    // process each contract artifact
    for (const contractInfo of contractsToProcess) {
      const contractDetails = this.processContractABI(
        contractInfo,
        topicsToContracts,
        config,
      );

      contracts.push(contractDetails);
    }

    logMessage(chalk.green('Topic list written successfully'));

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
    config: TransformedConfig,
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
  private writeContractABI(
    contractInfo: ContractInfo,
    config: TransformedConfig,
  ): void {
    const abisOutputDir = config.output.abis;
    mkdirp.sync(abisOutputDir);

    fs.writeFileSync(
      path.join(abisOutputDir, `${contractInfo.contractName}.json`),
      JSON.stringify(contractInfo.abi, null, 2),
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
  ): void {
    for (const event of events) {
      const contractNames = [contractName];

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
    // For each contract event
    for (const contract of contracts) {
      for (const event of contract.events) {
        logMessage(
          `${contract.contractName} ${event.eventName} entity generating...`,
        );

        // Now pass the entitiesPath to generateTypeOrmEntity
        const entity = generateTypeOrmEntity(
          event.eventName,
          event.compressedTopic,
          event.inputs,
          undefined, // parent entity name
          undefined, // is array
          entitiesPath, // pass the entities path
        );

        // Write the entity file
        const entityName = generateTypeOrmEntityName(
          event.eventName,
          event.compressedTopic,
        );
        const entityFilePath = path.join(entitiesPath, `${entityName}.ts`);

        writeFileToLint(entityFilePath, entity);

        logMessage(
          chalk.green(
            `${contract.contractName} ${event.eventName} entity generated successfully`,
          ),
        );
      }
    }
  }
}
