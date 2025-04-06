import { EventFragment } from 'ethers/lib/utils';
import { getFullEventSignature } from './getFullEventSignature';
import { ethers } from 'ethers';
import { SomeContractArtifact } from 'solidity-event-test-suite';
import { fail } from 'assert';

describe('getFullEventSignature', () => {
  test('should correctly format OrderFilled event with nested tuples', () => {
    const orderFilledEvent = {
      name: 'OrderFilled',
      inputs: [
        { type: 'bytes32', name: 'orderHash' },
        {
          type: 'tuple',
          name: 'order',
          components: [
            { type: 'uint64', name: 'nonce' },
            { type: 'uint64', name: 'expiry' },
            { type: 'address', name: 'maker' },
            {
              type: 'tuple',
              name: 'condition',
              components: [
                { type: 'address', name: 'token' },
                { type: 'address', name: 'vault' },
                { type: 'uint88', name: 'amount' },
                { type: 'bool', name: 'isEscrow' },
                { type: 'uint256', name: 'deadline' },
              ],
            },
            { type: 'address', name: 'target' },
            { type: 'address', name: 'recipient' },
            { type: 'address', name: 'currency' },
            { type: 'uint256', name: 'price' },
            { type: 'uint256', name: 'royalty' },
            { type: 'address', name: 'royaltyRecipient' },
            {
              type: 'tuple',
              name: 'extra',
              components: [
                { type: 'address', name: 'delegateCaller' },
                { type: 'uint256', name: 'fee' },
                { type: 'bytes32', name: 'salt' },
              ],
            },
            { type: 'bool', name: 'isDeliver' },
          ],
        },
        { type: 'uint256', name: 'filledPrice' },
        { type: 'uint256', name: 'filledAmount' },
        { type: 'address', name: 'receiver' },
        { type: 'bytes32', name: 'extraData' },
        { type: 'uint256', name: 'timestamp' },
        { type: 'uint256', name: 'txFee' },
        { type: 'uint256', name: 'protocolFee' },
        { type: 'uint256', name: 'royaltyFee' },
      ],
    } as EventFragment;

    const expectedSignature =
      'OrderFilled(bytes32,(uint64,uint64,address,(address,address,uint88,bool,uint256),address,address,address,uint256,uint256,address,(address,uint256,bytes32),bool),uint256,uint256,address,bytes32,uint256,uint256,uint256,uint256)';

    const result = getFullEventSignature(orderFilledEvent);
    expect(result).toEqual(expectedSignature);
  });

  test('should correctly format ComplexEvent with arrays of tuples and nested structures', () => {
    // Mock of a complex event with array of tuples and nested structures
    const complexEvent = {
      name: 'ComplexEvent',
      inputs: [
        { type: 'address', name: 'creator' },
        {
          type: 'tuple[]',
          name: 'positions',
          components: [
            { type: 'uint256', name: 'id' },
            { type: 'string', name: 'name' },
            {
              type: 'tuple',
              name: 'details',
              components: [
                { type: 'uint8', name: 'category' },
                { type: 'bool', name: 'isActive' },
                {
                  type: 'tuple[3]',
                  name: 'values',
                  components: [
                    { type: 'uint256', name: 'amount' },
                    { type: 'bytes32', name: 'hash' },
                  ],
                },
              ],
            },
          ],
        },
        { type: 'uint256', name: 'timestamp' },
        { type: 'bytes', name: 'signature' },
      ],
    } as EventFragment;

    const expectedSignature =
      'ComplexEvent(address,(uint256,string,(uint8,bool,(uint256,bytes32)[3]))[],uint256,bytes)';

    const result = getFullEventSignature(complexEvent);
    expect(result).toEqual(expectedSignature);
  });
});

describe('getFullEventSignature for solidity-event-test-suite', () => {
  let contractInterface: ethers.utils.Interface;

  beforeAll(() => {
    contractInterface = new ethers.utils.Interface(SomeContractArtifact.abi);
  });

  // Helper function to test each event
  const testEvent = (eventName: string) => {
    test(`can correctly generate signature for ${eventName}`, () => {
      // Find the event in the ABI
      const eventAbi = SomeContractArtifact.abi.find(
        (item) => item.type === 'event' && item.name === eventName,
      );

      if (!eventAbi) {
        fail(`Event ${eventName} not found in ABI`);
        return;
      }

      // Convert ABI to EventFragment
      const eventFragment = ethers.utils.EventFragment.from(eventAbi);

      // Get expected signature from ethers
      const expectedSignature = eventFragment.format();

      // Generate signature with our function
      const generatedSignature = getFullEventSignature(eventFragment);

      try {
        // Test if the event fragment can be found with our signature
        const topic = contractInterface.getEventTopic(eventFragment);

        // If we get here, it works!
        expect(topic).toBeDefined();

        // Verify signatures match
        expect(generatedSignature).toEqual(expectedSignature);
      } catch (error) {
        // This will fail the test
        console.error(`Error for ${eventName}:`, error);
        fail(`Failed to get event fragment for ${eventName}`);
      }
    });
  };

  // Test all events from the contract
  const eventNames = SomeContractArtifact.abi
    .filter((item) => item.type === 'event')
    .map((item) => item.name);

  eventNames.forEach((eventName) => testEvent(eventName));
});
