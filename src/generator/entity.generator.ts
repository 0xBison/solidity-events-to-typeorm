import { ParamType } from 'ethers/lib/utils';
import { snakeCase } from 'snake-case';
import { pascalCase } from 'pascal-case';
import camelcase from 'camelcase';
import { ethers } from 'ethers';
import path from 'path/posix';
import { existsSync, writeFileSync } from 'fs';
import mkdirp from 'mkdirp';
import { getTypeDetails, TypeDetails } from '../utils/getTypeDetails';
import { generateWarning } from '../utils/generateWarning';

export function generateWarningAndImports(): string {
  return `${generateWarning()}\nimport { Column, Entity, JoinColumn, OneToMany, ManyToOne, OneToOne, PrimaryGeneratedColumn, DeleteDateColumn, Index } from "typeorm";
import * as constants from "../constants";
import { BlockchainEventEntity } from "./BlockchainEventEntity";
  
`;
}

function storeChildEntities(childEntities: string[]): void {
  // TODO: Does this work for unlimited levels deep?
  // TODO: Dont hardcode this path
  const entitiesOutputPath = '../output/entities/';

  for (let childEntity of childEntities) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const entityName = childEntity.match(/[^\s]+Entity_[^\s]+/)![0];
    const entityFilePath = path.join(entitiesOutputPath, `${entityName}.ts`);

    const entitiesToImport: Set<string> = new Set();

    const allEntities = childEntity.matchAll(
      /[^\s]+Entity_[^\s|^;|^,|^)|^[]+/g,
    );
    for (const entity of allEntities) {
      entitiesToImport.add(entity[0]);
    }

    // No need to import the entity being declared
    entitiesToImport.delete(entityName);

    let entitiesImportStatements = `*/\n`;
    for (const entity of entitiesToImport) {
      entitiesImportStatements = entitiesImportStatements.concat(
        `import { ${entity} } from "./${entity}";\n`,
      );
    }

    childEntity = childEntity.replace('*/\n', entitiesImportStatements);

    if (!existsSync(entitiesOutputPath)) {
      mkdirp.sync(entitiesOutputPath);
    }

    writeFileSync(entityFilePath, childEntity);
  }
}

const generateTableName = (entityName: string, compressedTopic: string) =>
  `${snakeCase(entityName)}_${compressedTopic}`;

const generateTypeOrmEntityName = (
  entityName: string,
  compressedTopic: string,
) => `${pascalCase(entityName)}Entity_${compressedTopic}`;

/**
 *
 * @param parameterName should be in camel case
 * @param compressedTopic
 * @param parentEntityName
 * @returns
 */
function generateChildEntityRelation(
  parameterName: string,
  compressedTopic: string,
  parentEntityName: string,
  isArray: boolean,
  fieldInfo: TypeDetails,
) {
  const typeOrmEntityName = generateTypeOrmEntityName(
    parameterName,
    compressedTopic,
  );

  return `  ${isArray ? '@OneToMany' : '@OneToOne'}(
    () => ${typeOrmEntityName},
    (${parameterName}: ${typeOrmEntityName}) => ${parameterName}.${parentEntityName},
    {
      eager: true,
      cascade: true,
    }
  )
  @JoinColumn()
  public ${parameterName}: ${typeOrmEntityName}${isArray ? `[]` : ``}; // ${
    fieldInfo.fullType
  }\n\n`;
}

/**
 *
 * @param parameterName should be camel case
 * @param underlyingType
 * @param typeSize
 * @returns
 */
function generateTypeOrmColumn(
  parameterName: string,
  underlyingType: string,
  typeSize: string,
): string {
  let typeString: string;

  let paramTypeName = 'string';

  if (underlyingType === 'uint' || underlyingType === 'int') {
    typeString = `type: "numeric",
    precision: constants.${underlyingType.toUpperCase()}_${typeSize}_MAX_DIGITS`;
  } else if (underlyingType === 'bool') {
    typeString = `type: "boolean"`;
    paramTypeName = 'boolean';
  } else {
    typeString = `type: "varchar"`;
  }

  const snakeCaseField = snakeCase(parameterName);
  return `  @Column({
    name: "${snakeCaseField}",
    nullable: false,
    ${typeString},
    update: false,
    ${
      underlyingType === 'address' ? `length: constants.BYTES_32_LENGTH,\n` : ``
    }  })
  public ${parameterName}: ${paramTypeName}; // ${underlyingType}\n\n`;
}

function paramsToTypeOrmColumns(
  params: ParamType[],
  compressedTopic: string,
  typeOrmEntityName: string,
  childEntities: string[],
  parentEntityName?: string,
): string {
  let output = ``;

  for (const param of params) {
    const fieldInfo: TypeDetails = getTypeDetails(param);
    const paramName = camelcase(param.name);

    if (fieldInfo.underlyingType === 'tuple' || fieldInfo.arraySize !== 0) {
      // TODO: Cater for arrays...
      const isArray = fieldInfo.arraySize !== 0;

      output += generateChildEntityRelation(
        paramName,
        compressedTopic,
        typeOrmEntityName,
        isArray,
        fieldInfo,
      );

      let paramComponents;

      if (fieldInfo.underlyingType === 'tuple') {
        paramComponents = param.components;
      } else {
        // the field type was array and not a tuple i.e. it was a primitive array
        // so we construct a ParamType from the underlying type (non-array) as the param components.
        // the next pass will be a primitive and end the recurse for that branch
        paramComponents = [
          ethers.utils.ParamType.from({
            name: param.name,
            type: fieldInfo.underlyingType,
            indexed: param.indexed,
          }),
        ];
      }

      childEntities.push(
        generateTypeOrmEntity(
          paramName,
          compressedTopic,
          paramComponents,
          typeOrmEntityName,
          isArray,
        ),
      );
    } else {
      output += generateTypeOrmColumn(
        paramName,
        fieldInfo.underlyingType,
        // if this value doesnt exist, it is unused so its safe to set to empty string
        fieldInfo.typeSize || '',
      );
    }
  }

  if (parentEntityName) {
    const parentEntityClassName = `${pascalCase(
      parentEntityName,
    )}Entity_${compressedTopic}`;

    const parentEntityVariableName = camelcase(parentEntityName);

    output += `  @ManyToOne(
    () => ${parentEntityClassName},
    (${parentEntityVariableName}: ${parentEntityClassName}) =>
      ${parentEntityVariableName}.${camelcase(typeOrmEntityName)}
  )
  public ${parentEntityVariableName}: ${parentEntityClassName};\n\n`;
  }

  return output;
}

/**
 *
 * @param entityName the name of the field or the parent event if its the parent call to this method
 * @param compressedTopic topic hash of parent event
 * @param inputs inputs in event
 * @returns
 */
export function generateTypeOrmEntity(
  entityName: string,
  compressedTopic: string,
  inputs: Array<ParamType>,
  parentEntityName?: string,
  isArray?: boolean,
): string {
  const tableName = generateTableName(entityName, compressedTopic);
  const typeOrmEntityName = generateTypeOrmEntityName(
    entityName,
    compressedTopic,
  );
  const camelCaseEntityName = camelcase(`${entityName}`);
  const childEntities: string[] = [];

  let output = ``;

  // if top most entity of file add warning and imports
  output += generateWarningAndImports();

  // add class declaration line
  output += `@Entity({ name: "${tableName}" })\nexport class ${typeOrmEntityName} ${
    !parentEntityName ? 'extends BlockchainEventEntity ' : ''
  }{\n`;
  // if child then add auto increment id
  if (parentEntityName) {
    output += `  @PrimaryGeneratedColumn("increment")\n  public id: string;\n\n`;
  }

  // add params to entity
  output += `${paramsToTypeOrmColumns(
    inputs,
    compressedTopic,
    camelCaseEntityName,
    childEntities,
    parentEntityName,
  )}`;

  storeChildEntities(childEntities);

  if (!parentEntityName) {
    const hashedEntityName = output.match(/[^\s]+Entity_[^\s]+/)![0];

    const entitiesToImport: Set<string> = new Set();

    const allEntities = output.matchAll(/[^\s]+Entity_[^\s|^;|^,|^)|^[]+/g);

    for (const entity of allEntities) {
      entitiesToImport.add(entity[0]);
    }

    entitiesToImport.delete(hashedEntityName);

    let entitiesImportStatements = `*/\n`;
    for (const entity of entitiesToImport) {
      entitiesImportStatements = entitiesImportStatements.concat(
        `import { ${entity} } from "./${entity}";\n`,
      );
    }

    output = output.replace('*/\n', entitiesImportStatements);
  }

  // closing brace for class
  output += `}\n`;

  if (!isArray) {
    const lastManyToOneIndex = output.lastIndexOf('ManyToOne');

    const manyToOneOccurrences = (output.match(/ManyToOne/g) || []).length;

    if (manyToOneOccurrences > 1 && lastManyToOneIndex !== -1) {
      const outputStart = output.substring(0, lastManyToOneIndex);
      const outputEnd = output.substring(
        lastManyToOneIndex + 'ManyToOne'.length,
      );
      output = `${outputStart}OneToOne${outputEnd}`;
    }
  }

  return output;
}
