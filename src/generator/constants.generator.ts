import { ethers } from 'ethers';
import { Config } from '../types';
import * as fs from 'fs';
import { generateWarning } from '../utils/generateWarning';
import { TypeOrmGenerator } from './generator.interface';
import { writeFileToLint } from '../utils/lint';

/**
 * Generator class that creates TypeORM-compatible constant definitions for numeric and bytes types.
 * These constants define the maximum values and digit lengths for different integer sizes,
 * as well as the maximum lengths for different bytes sizes used in Ethereum/Solidity.
 */
export class TypeOrmConstantsGenerator implements TypeOrmGenerator {
  /**
   * Generates constant definitions and writes them to a file.
   * @param config - Configuration object containing output path and other settings
   */
  public generate(config: Config): void {
    const constants = this.generateConstants();
    const constantsFilePath = `${config.output.path}/constants.ts`;

    writeFileToLint(constantsFilePath, `${generateWarning()}\n`);
    fs.appendFileSync(constantsFilePath, constants);
  }

  /**
   * Combines numeric and bytes constants into a single string.
   * @returns A string containing all constant definitions
   * @private
   */
  private generateConstants(): string {
    return this.generateNumericConstants() + this.generateBytesConstants();
  }

  /**
   * Generates constants for different integer sizes (8 to 256 bits).
   * For each size, creates four constants:
   * - UINT_X_MAX_VALUE: Maximum value for unsigned integer of X bits
   * - UINT_X_MAX_DIGITS: Number of digits in the maximum unsigned value
   * - INT_X_MAX_VALUE: Maximum value for signed integer of X bits
   * - INT_X_MAX_DIGITS: Number of digits in the maximum signed value
   * @returns A string containing all numeric constant definitions
   * @private
   */
  private generateNumericConstants(): string {
    const stepSize = 8;
    const maxSize = 256;
    let currentValue: number = stepSize;
    let numericConstants = ``;

    while (currentValue <= maxSize) {
      const intMaxValue = ethers.BigNumber.from('2')
        .pow(currentValue - 1)
        .sub(1);
      const intMaxLength = intMaxValue.toString().length;

      const uintMaxValue = ethers.BigNumber.from('2').pow(currentValue).sub(1);
      const uintMaxLength = uintMaxValue.toString().length;

      numericConstants += `export const UINT_${currentValue}_MAX_VALUE = "${uintMaxValue.toString()}";\n`;
      numericConstants += `export const UINT_${currentValue}_MAX_DIGITS = ${uintMaxLength};\n`;
      numericConstants += `export const INT_${currentValue}_MAX_VALUE = "${intMaxValue.toString()}";\n`;
      numericConstants += `export const INT_${currentValue}_MAX_DIGITS = ${intMaxLength};\n`;
      numericConstants += `\n`;

      currentValue += stepSize;
    }

    return numericConstants;
  }

  /**
   * Generates constants for different bytes sizes (1 to 32 bytes).
   * Creates BYTES_X_LENGTH constants representing the maximum string length
   * for each bytes size when represented in hexadecimal format (including '0x' prefix).
   * @returns A string containing all bytes constant definitions
   * @private
   */
  private generateBytesConstants(): string {
    let bytesConstants = ``;

    for (let bytesLength = 1; bytesLength <= 32; bytesLength++) {
      const maxLength = 2 + bytesLength * 2;
      bytesConstants += `export const BYTES_${bytesLength}_LENGTH = ${maxLength};\n`;
    }

    return bytesConstants;
  }
}
