import { ParamType } from 'ethers/lib/utils';

export interface TypeDetails {
  fullType: string; // uint8[]
  underlyingType: string; // uint
  arraySize: number; // 0 if not an array, -1 if dynamic, otherwise array size
  typeSize?: string; // 8
}

// tuple
// tuple[2]
// uint64[3]
// uint64
// firstly check if there is [] and make sure its there at most once. if more than once throw error
// if it is a tuple, we need to flatten the fields in memory - fields[]
// if it is an array then we need to check if its a dynamic array - bool dynamicArray
// for dynamic we store as a separate table

/**
 * Takes in a solidity type and gives back details of that type
 * @param typeName The fully qualified type (e.g. "address", "tuple(address)", "uint256[3][]"
 * @returns {@linkcode TypeDetails} object with details of the type
 */
export function getTypeDetails(paramType: ParamType): TypeDetails {
  const { type } = paramType;
  const underlyingType: string = (type.match(/[a-zA-Z]+/) || [''])[0];

  let arraySizeValue = (type.match(/.*\[(.*)\].*/) || [type, '0'])[1];

  if (arraySizeValue === '') {
    arraySizeValue = '-1';
  }

  const arraySize = parseInt(arraySizeValue);

  const typeDetails: TypeDetails = {
    fullType: type,
    underlyingType,
    arraySize,
  };

  const typeSize: string = (type.match(/[0-9]+(?!\])/) || [''])[0];

  if (typeSize !== '') {
    typeDetails.typeSize = typeSize;
  }

  return typeDetails;
}
