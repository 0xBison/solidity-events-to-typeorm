import { EventFragment } from 'ethers/lib/utils';

/**
 * Generates the correct event signature from an EventFragment with properly expanded nested tuple types
 * @param eventFragment The EventFragment object from ethers.js
 * @returns The fully expanded event signature string with proper tuple formatting
 */
export function getFullEventSignature(eventFragment: EventFragment): string {
  // Function to recursively expand a single input type
  const expandType = (input: any): string => {
    if (input.type === 'tuple') {
      // For tuples, recursively process components and wrap in parentheses
      const componentsTypes = input.components.map(expandType).join(',');
      return `(${componentsTypes})`;
    } else if (input.type.startsWith('tuple[')) {
      // Handle array of tuples
      const match = input.type.match(/\[(.*?)\]/);
      const arraySuffix = match ? `[${match[1]}]` : '[]';
      const componentsTypes = input.components.map(expandType).join(',');

      // Return the tuple with array notation - both for fixed and dynamic size arrays
      return `(${componentsTypes})${arraySuffix}`;
    } else {
      // Return simple types as-is
      return input.type;
    }
  };

  // Map all inputs through the expandType function
  const expandedTypes = eventFragment.inputs.map(expandType).join(',');

  // Return the full event signature
  return `${eventFragment.name}(${expandedTypes})`;
}
