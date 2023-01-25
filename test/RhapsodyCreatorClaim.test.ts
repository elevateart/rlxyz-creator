export const currentBlockTime = 123456789;

import { testContractBaseURI } from './core/testContractBaseURI';
import { testContractCore } from './core/testContractCore';
import { testContractSale } from './core/testContractSale';
import { testContractTokenURI } from './core/testContractTokenURI';
import { parseEther } from './helpers/constant';
import { beforeEachSetupForClaim } from './helpers/contractBeforeEachSetup';

export const params = {
  name: 'Rhapsody Creator Test',
  symbol: 'RCT',
  collectionSize: 1111,
  maxPresaleBatchPerAddress: 2,
  maxPublicBatchPerAddress: 2,
  amountForPromotion: 20,
  mintPrice: parseEther(0.333),
};

describe('RhapsodyCreatorClaim', () => {
  const _beforeEach = beforeEachSetupForClaim;

  // test cases
  testContractCore(_beforeEach);
  // testContractDeployment(_beforeEach);
  testContractBaseURI(_beforeEach);
  testContractTokenURI(_beforeEach);
  testContractSale(_beforeEach, 'basic', ['claim']);
});
