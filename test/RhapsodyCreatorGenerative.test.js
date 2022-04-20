const debug = require ('debug') ('ptv3:RhapsodyCreator');
const {expect} = require ('chai');
const hre = require ('hardhat');
const {overrides, parseEther} = require ('./helpers/constant');
const {buildWhitelist, generateLeaf} = require ('../scripts/helpers/whitelist');

const currentBlockTime = 123456789;
const name = 'Rhapsody Creator Test';
const symbol = 'RCT';

const params = {
  collectionSize: 1111,
  maxPresaleBatchPerAddress: 2,
  maxPublicBatchPerAddress: 2,
  amountForPromotion: 20,
  mintPrice: parseEther (0.333),
};

describe ('RhapsodyCreatorGenerative', () => {
  let deployer, admin, minterA, minterB, minterC;

  let creator;
  let presaleMerklized;
  let claimMerklized;
  let randomizer;

  beforeEach (async () => {
    [
      deployer,
      admin,
      minterA,
      minterB,
      minterC,
    ] = await hre.ethers.getSigners ();

    debug (`using wallet ${deployer.address}`);
    debug ('deploying creator...');

    const Randomizer = await hre.ethers.getContractFactory (
      'Randomizer',
      deployer,
      overrides
    );

    const RhapsodyCreator = await hre.ethers.getContractFactory (
      'RhapsodyCreatorGenerativeTest',
      deployer,
      overrides
    );

    randomizer = await Randomizer.deploy ();

    creator = await RhapsodyCreator.deploy (
      params.collectionSize,
      params.maxPublicBatchPerAddress,
      params.amountForPromotion,
      params.mintPrice
    );

    presaleMerklized = await buildWhitelist ([
      [minterA.address, 2],
      [minterB.address, 2],
      [minterC.address, 2],
    ]);

    claimMerklized = await buildWhitelist ([
      [minterA.address, 2],
      [minterB.address, 2],
      [minterC.address, 1],
    ]);

    await creator.setPresaleMerkleRoot (presaleMerklized.root);
    await creator.setClaimMerkleRoot (claimMerklized.root);
    await creator.setMintRandomizerContract (randomizer.address);
    await creator.transferOwnership (admin.address);
    await randomizer.addDependency (creator.address);
    creator = creator.connect (admin);
  });

  describe ('core', () => {
    it ('should have name', async () => {
      expect (await creator.name ()).to.equal (name);
    });

    it ('should have symbol', async () => {
      expect (await creator.symbol ()).to.equal (symbol);
    });
  });

  describe ('deployment', () => {
    it ('should have an allocation promotion amount', async () => {
      expect (await creator.amountForPromotion ()).to.equal (
        params.amountForPromotion
      );
    });

    it ('should have set the correct max public mint per address', async () => {
      expect (await creator.maxPublicBatchPerAddress ()).to.equal (
        params.maxPublicBatchPerAddress
      );
    });

    it ('should have a valid mint price', async () => {
      expect (await creator.mintPrice ()).to.equal (params.mintPrice);
    });
  });

  describe ('baseURI', () => {
    it ('should have empty base uri', async () => {
      expect (await creator.baseURI ()).to.equal ('');
    });

    it ('should set baseUri', async () => {
      const baseURI = 'https://someuri.com';
      await creator.setBaseURI (baseURI);
      expect (await creator.baseURI ()).to.equal (baseURI);
    });

    it ('should be able to change the baseURI', async () => {
      const baseURI = 'https://somebaseuri.com/';
      await creator.setBaseURI (baseURI);
      expect (await creator.baseURI ()).to.equal (baseURI);

      const baseURI2 = 'https://someotherbaseuri.com/';
      await creator.setBaseURI (baseURI2);
      expect (await creator.baseURI ()).to.equal (baseURI2);
    });
  });

  describe ('tokenURI', () => {
    let baseURI;
    beforeEach (async () => {
      baseURI = 'https://somebaseuri.com/';
      await creator.setBaseURI (baseURI);
      await creator.setMintTime (
        currentBlockTime + 1,
        currentBlockTime + 2,
        currentBlockTime + 3
      );
    });

    it ('should return valid token uri if minting singles', async () => {
      await creator
        .connect (minterA)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenURI (0)).to.equal (baseURI + '0');

      await creator
        .connect (minterA)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenURI (1)).to.equal (baseURI + '1');

      await creator
        .connect (minterB)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenURI (2)).to.equal (baseURI + '2');

      await creator
        .connect (minterC)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenURI (3)).to.equal (baseURI + '3');

      await expect (creator.tokenURI (4)).to.be.revertedWith (
        'URIQueryForNonexistentToken'
      );
    });

    it ('should return valid token uri if minting many at once', async () => {
      await creator
        .connect (minterA)
        .publicMint (2, {value: parseEther (0.333 * 2)});
      await creator
        .connect (minterB)
        .publicMint (2, {value: parseEther (0.333 * 2)});
      await creator
        .connect (minterC)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenURI (0)).to.equal (baseURI + '0');
      expect (await creator.tokenURI (1)).to.equal (baseURI + '1');
      expect (await creator.tokenURI (2)).to.equal (baseURI + '2');
      expect (await creator.tokenURI (3)).to.equal (baseURI + '3');
      expect (await creator.tokenURI (4)).to.equal (baseURI + '4');
      await expect (creator.tokenURI (5)).to.be.revertedWith (
        'URIQueryForNonexistentToken'
      );
    });
  });

  describe ('tokenHash', () => {
    let baseURI;
    beforeEach (async () => {
      baseURI = 'https://somebaseuri.com/';
      await creator.setBaseURI (baseURI);
      await creator.setMintTime (
        currentBlockTime + 1,
        currentBlockTime + 2,
        currentBlockTime + 3
      );
    });

    it ('should return valid token hash', async () => {
      await creator
        .connect (minterA)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenHash (0)).to.equal (
        '0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563'
      );

      await creator
        .connect (minterA)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenHash (1)).to.equal (
        '0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'
      );

      await creator
        .connect (minterB)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenHash (2)).to.equal (
        '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace'
      );

      await creator
        .connect (minterC)
        .publicMint (1, {value: parseEther (0.333)});
      expect (await creator.tokenHash (3)).to.equal (
        '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b'
      );

      await expect (creator.tokenHash (4)).to.be.revertedWith (
        'HashQueryForNonexistentToken'
      );
    });

    it ('should return valid token hash if multiple mints', async () => {
      await creator
        .connect (minterA)
        .publicMint (2, {value: parseEther (0.333 * 2)});
      expect (await creator.tokenHash (0)).to.equal (
        '0x290decd9548b62a8d60345a988386fc84ba6bc95484008f6362f93160ef3e563'
      );
      expect (await creator.tokenHash (1)).to.equal (
        '0xb10e2d527612073b26eecdfd717e6a320cf44b4afac2b0732d9fcbe2b7fa0cf6'
      );
      await creator
        .connect (minterB)
        .publicMint (2, {value: parseEther (0.333 * 2)});
      expect (await creator.tokenHash (2)).to.equal (
        '0x405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace'
      );
      expect (await creator.tokenHash (3)).to.equal (
        '0xc2575a0e9e593c00f959f8c92f12db2869c3395a3b0502d05e2516446f71f85b'
      );
      await creator
        .connect (minterC)
        .publicMint (1, {value: parseEther (0.333 * 1)});
      expect (await creator.tokenHash (4)).to.equal (
        '0x8a35acfbc15ff81a39ae7d344fd709f28e8600b4aa8c65c6b64bfe7fe36bd19b'
      );
      await expect (creator.tokenHash (5)).to.be.revertedWith (
        'HashQueryForNonexistentToken'
      );
    });

    // describe ('maxCollection', () => {
    //   it ('should all be unique token hashes', async () => {
    //     const RhapsodyCreator = await hre.ethers.getContractFactory (
    //       'RhapsodyCreatorGenerativeTest',
    //       deployer,
    //       overrides
    //     );
    //     creatorA = await RhapsodyCreator.deploy (
    //       1200,
    //       1200,
    //       0,
    //       parseEther (0.01)
    //     );
    //     await creatorA.setMintTime (
    //       currentBlockTime + 100,
    //       currentBlockTime + 105,
    //       currentBlockTime + 110
    //     );
    //     await creatorA.setMintRandomizerContract (randomizer.address);
    //     randomizer.addDependency (creatorA.address);

    //     let hashes = [];
    //     for (let i = 0; i < 12; i++) {
    //       await expect (
    //         creatorA.connect (minterA).publicMint (100, {
    //           value: parseEther (0.01 * 100),
    //         })
    //       )
    //         .emit (creatorA, 'Created')
    //         .withArgs (minterA.address, i * 100, 100);

    //       for (let id = 0; id < 100; id++) {
    //         hashes.push (await creatorA.tokenHash (id * i));
    //       }
    //     }
    //     console.log (hashes);
    //   });
    // });
  });

  describe ('sale', () => {
    describe ('claimMint', () => {
      let creatorA;
      let minter;
      beforeEach (async () => {
        const RhapsodyCreator = await hre.ethers.getContractFactory (
          'RhapsodyCreatorGenerativeTest',
          deployer,
          overrides
        );
        creatorA = await RhapsodyCreator.deploy (
          params.collectionSize,
          params.maxPublicBatchPerAddress,
          params.amountForPromotion,
          params.mintPrice
        );

        await creatorA.setClaimMerkleRoot (claimMerklized.root);

        await creatorA.setMintTime (
          currentBlockTime + 100,
          currentBlockTime + 105,
          currentBlockTime + 110
        );
        await creatorA.setMintRandomizerContract (randomizer.address);
        randomizer.addDependency (creatorA.address);

        minter = async (minter, invocations, proof) =>
          creatorA.connect (minter).claimMint (invocations, proof);
      });

      it ('should be able to mint if address whitelisted', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = claimMerklized.tree.getHexProof (leaf);
        await expect (minter (minterA, 2, proof)).to
          .emit (creatorA, 'Created')
          .withArgs (minterA.address, 0, 2);
      });

      it ('should not be able to mint if less than allocated invocation', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (minter (minterA, 1, proof)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );
      });

      it ('should fail if minting invocation is 0', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = claimMerklized.tree.getHexProof (leaf);
        await expect (minter (minterA, 0, proof)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-lower-boundary'
        );
      });

      it ('should fail if trying to minting more than maxPresaleBatchPerAddress', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = claimMerklized.tree.getHexProof (leaf);
        await expect (
          minter (minterA, params.maxPublicBatchPerAddress + 1, proof)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );
      });

      it ('should fail address proof if passed in invalid maxInvocations', async () => {
        let leaf = generateLeaf (minterA.address, 3);
        let proof = claimMerklized.tree.getHexProof (leaf);
        await expect (minter (minterA, 2, proof)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );

        leaf = generateLeaf (minterC.address, 5);
        proof = claimMerklized.tree.getHexProof (leaf);
        await expect (minter (minterC, 1, proof)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );
      });

      it ('should only be able to mint once', async () => {
        let leaf = generateLeaf (minterC.address, 1);
        let proof = claimMerklized.tree.getHexProof (leaf);

        await expect (minter (minterC, 1, proof)).to
          .emit (creatorA, 'Created')
          .withArgs (minterC.address, 0, 1);

        await expect (minter (minterC, 1, proof)).to.to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );

        leaf = generateLeaf (minterA.address, 2);
        proof = claimMerklized.tree.getHexProof (leaf);

        await expect (minter (minterA, 2, proof)).to
          .emit (creatorA, 'Created')
          .withArgs (minterA.address, 1, 2);

        await expect (minter (minterA, 1, proof)).to.to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );
      });

      it ('should not be able to transfer NFTs out and mint again', async () => {
        let leaf = generateLeaf (minterC.address, 1);
        let proof = claimMerklized.tree.getHexProof (leaf);

        await expect (minter (minterC, 1, proof)).to
          .emit (creatorA, 'Created')
          .withArgs (minterC.address, 0, 1);

        await creatorA
          .connect (minterC)
          .transferFrom (minterC.address, minterB.address, 0);

        await expect (minter (minterC, 1, proof)).to.to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );
      });

      it ('should not be able to mint if not whitelisted', async () => {
        const wrongProof = [
          '0x1428975b69ccaa80e5613347ec07d7a0696894fc28b3655983d43f9eb00032a1',
          '0xf55f0dad9adfe0f2aa1946779b3ca83c165360edef49c6b72ddc0e2f070f7ff6',
        ];

        await expect (minter (minterB, 2, wrongProof)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );
      });
    });

    describe ('presaleMint', () => {
      let creatorA;
      let presaleMinter;
      beforeEach (async () => {
        const RhapsodyCreator = await hre.ethers.getContractFactory (
          'RhapsodyCreatorGenerativeTest',
          deployer,
          overrides
        );

        creatorA = await RhapsodyCreator.deploy (
          params.collectionSize,
          params.maxPublicBatchPerAddress,
          params.amountForPromotion,
          params.mintPrice
        );

        await creatorA.setPresaleMerkleRoot (presaleMerklized.root);

        await creatorA.setMintTime (
          currentBlockTime + 100,
          currentBlockTime + 105,
          currentBlockTime + 110
        );
        await creatorA.setMintRandomizerContract (randomizer.address);
        randomizer.addDependency (creatorA.address);

        presaleMinter = async (
          minter,
          invocations,
          maxInvocation,
          proof,
          ether
        ) =>
          creatorA
            .connect (minter)
            .presaleMint (invocations, maxInvocation, proof, {
              value: parseEther (ether),
            });
      });

      it ('should be able to mint if address whitelisted', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (presaleMinter (minterA, 2, 2, proof, 0.333 * 2)).to
          .emit (creatorA, 'Created')
          .withArgs (minterA.address, 0, 2);
      });

      it ('should be able to mint if less than max invocation limit', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (presaleMinter (minterA, 1, 2, proof, 0.333)).to
          .emit (creatorA, 'Created')
          .withArgs (minterA.address, 0, 1);
      });

      it ('should fail if minting invocation is 0', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (
          presaleMinter (minterA, 0, 2, proof, 0)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-lower-boundary'
        );
      });

      it ('should fail if trying to minting more than maxPresaleBatchPerAddress', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (
          presaleMinter (minterA, 3, 2, proof, 3 * 0.333)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );
      });

      it ('should fail address proof if passed in invalid maxInvocations', async () => {
        let leaf = generateLeaf (minterA.address, 5);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (
          presaleMinter (minterA, 1, 10, proof, 0.333)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );

        leaf = generateLeaf (minterB.address, 5);
        proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (
          presaleMinter (minterB, 5, 10, proof, 0.333 * 5)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );
      });

      it ('should fail if too much or too little eth supplied', async () => {
        let leaf = generateLeaf (minterA.address, 5);
        let proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (
          presaleMinter (minterA, 1, 5, proof, 1.5)
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-mint-value');

        leaf = generateLeaf (minterB.address, 5);
        proof = presaleMerklized.tree.getHexProof (leaf);
        await expect (
          presaleMinter (minterB, 5, 10, proof, 0)
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-mint-value');
      });

      it ('should only be able to mint once', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);

        await expect (presaleMinter (minterA, 1, 2, proof, 1 * 0.333)).to
          .emit (creatorA, 'Created')
          .withArgs (minterA.address, 0, 1);

        await expect (
          presaleMinter (minterA, 1, 2, proof, 0.333)
        ).to.to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-double-mint'
        );

        leaf = generateLeaf (minterB.address, 2);
        proof = presaleMerklized.tree.getHexProof (leaf);

        await expect (presaleMinter (minterB, 1, 2, proof, 1 * 0.333)).to
          .emit (creatorA, 'Created')
          .withArgs (minterB.address, 1, 1);

        await expect (
          presaleMinter (minterB, 2, 2, proof, 2 * 0.333)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );
      });

      it ('should not be able to transfer NFTs out and mint again', async () => {
        let leaf = generateLeaf (minterA.address, 2);
        let proof = presaleMerklized.tree.getHexProof (leaf);

        await expect (presaleMinter (minterA, 1, 2, proof, 0.333)).to
          .emit (creatorA, 'Created')
          .withArgs (minterA.address, 0, 1);

        await creatorA
          .connect (minterA)
          .transferFrom (minterA.address, minterB.address, 0);

        await expect (
          presaleMinter (minterA, 1, 2, proof, 0.333)
        ).to.to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-double-mint'
        );
      });

      it ('should not be able to mint if not whitelisted', async () => {
        const wrongProof = [
          '0x1428975b69ccaa80e5613347ec07d7a0696894fc28b3655983d43f9eb00032a1',
          '0xf55f0dad9adfe0f2aa1946779b3ca83c165360edef49c6b72ddc0e2f070f7ff6',
        ];

        let leaf = generateLeaf (minterB.address, 5);
        let proof = presaleMerklized.tree.getHexProof (leaf);

        await expect (
          presaleMinter (minterB, 1, 5, wrongProof, 1 * 0.333)
        ).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-address-proof'
        );
      });

      describe ('variable whitelist', () => {
        let presaleMerklizedA;
        beforeEach (async () => {
          presaleMerklizedA = await buildWhitelist ([
            [minterB.address, 5],
            [minterA.address, 4],
            [minterC.address, 3],
          ]);
          await creatorA.setPresaleMerkleRoot (presaleMerklizedA.root);
        });

        it ('should be able to variable mint', async () => {
          let leaf = generateLeaf (minterA.address, 4);
          let proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (presaleMinter (minterA, 2, 4, proof, 2 * 0.333)).to
            .emit (creatorA, 'Created')
            .withArgs (minterA.address, 0, 2);

          leaf = generateLeaf (minterB.address, 5);
          proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (presaleMinter (minterB, 4, 5, proof, 4 * 0.333)).to
            .emit (creatorA, 'Created')
            .withArgs (minterB.address, 2, 4);

          leaf = generateLeaf (minterC.address, 3);
          proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (presaleMinter (minterC, 1, 3, proof, 1 * 0.333)).to
            .emit (creatorA, 'Created')
            .withArgs (minterC.address, 6, 1);
        });

        it ('should only allow max allocated variable amount in merkle root', async () => {
          let leaf = generateLeaf (minterA.address, 4);
          let proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (presaleMinter (minterA, 4, 4, proof, 4 * 0.333)).to
            .emit (creatorA, 'Created')
            .withArgs (minterA.address, 0, 4);

          leaf = generateLeaf (minterB.address, 5);
          proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (presaleMinter (minterB, 5, 5, proof, 5 * 0.333)).to
            .emit (creatorA, 'Created')
            .withArgs (minterB.address, 4, 5);
        });

        it ('should fail if trying to mint more than max limit of an allocated address limit', async () => {
          let leaf = generateLeaf (minterA.address, 4);
          let proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (
            presaleMinter (minterA, 5, 4, proof, 5 * 0.333)
          ).to.be.revertedWith (
            'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
          );

          leaf = generateLeaf (minterC.address, 3);
          proof = presaleMerklizedA.tree.getHexProof (leaf);
          await expect (
            presaleMinter (minterC, 4, 3, proof, 4 * 0.333)
          ).to.be.revertedWith (
            'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
          );
        });
      });

      // todo: finish this up!
      describe ('small collection', () => {
        let creatorB;
        let presaleMerklizedA;
        beforeEach (async () => {
          const RhapsodyCreator = await hre.ethers.getContractFactory (
            'RhapsodyCreatorGenerativeTest',
            deployer,
            overrides
          );
          presaleMerklizedA = await buildWhitelist ([
            [minterB.address, 5],
            [minterA.address, 4],
            [minterC.address, 3],
          ]);
          await creatorA.setPresaleMerkleRoot (presaleMerklizedA.root);

          creatorB = await RhapsodyCreator.deploy (12, 4, 0, params.mintPrice);
          await creatorB.setPresaleMerkleRoot (presaleMerklized.root);
          await creatorB.setMintTime (
            currentBlockTime + 100,
            currentBlockTime + 105,
            currentBlockTime + 110
          );
        });
      });
    });

    describe ('publicMint', () => {
      let publicMinter;
      beforeEach (async () => {
        await creator.setMintTime (
          currentBlockTime + 100,
          currentBlockTime + 105,
          currentBlockTime + 110
        );
        publicMinter = async (minter, invocations, ether) =>
          creator.connect (minter).publicMint (invocations, {
            value: parseEther (ether),
          });
      });

      it ('should be able to mint nfts in public mint', async () => {
        await expect (publicMinter (minterA, 1, 0.333)).to
          .emit (creator, 'Created')
          .withArgs (minterA.address, 0, 1);

        await expect (publicMinter (minterA, 1, 0.333)).to
          .emit (creator, 'Created')
          .withArgs (minterA.address, 1, 1);

        await expect (publicMinter (minterB, 2, 2 * 0.333)).to
          .emit (creator, 'Created')
          .withArgs (minterB.address, 2, 2);

        await expect (publicMinter (minterC, 2, 2 * 0.333)).to
          .emit (creator, 'Created')
          .withArgs (minterC.address, 4, 2);
      });

      it ('should only be able to max batch amount of nfts', async () => {
        await expect (publicMinter (minterA, 2, 0.333 * 2)).to
          .emit (creator, 'Created')
          .withArgs (minterA.address, 0, 2);

        await expect (publicMinter (minterB, 3, 3 * 0.333)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );
      });

      it ('should only be able to mint max batch amount of nfts even in two or more txs', async () => {
        await expect (publicMinter (minterA, 1, 0.333)).to
          .emit (creator, 'Created')
          .withArgs (minterA.address, 0, 1);

        await expect (publicMinter (minterA, 2, 0.333 * 2)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-upper-boundary'
        );
      });

      it ('should fail if minting invocation is 0', async () => {
        await expect (publicMinter (minterA, 0, 0.333)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-invocation-lower-boundary'
        );
      });
    });

    describe ('setMintTime', () => {
      it ('should be able to set valid mint times', async () => {
        await creator.setMintTime (
          currentBlockTime + 100,
          currentBlockTime + 105,
          currentBlockTime + 110
        );

        expect (await creator.claimTime ()).to.be.equal (
          currentBlockTime + 100
        );

        expect (await creator.presaleTime ()).to.be.equal (
          currentBlockTime + 105
        );

        expect (await creator.publicTime ()).to.be.equal (
          currentBlockTime + 110
        );
      });

      it ('can change presale and public time retroactively', async () => {
        await creator.setMintTime (
          currentBlockTime + 100,
          currentBlockTime + 105,
          currentBlockTime + 110
        );

        // forward time
        await creator.setMintTime (
          currentBlockTime + 105,
          currentBlockTime + 110,
          currentBlockTime + 115
        );

        expect (await creator.claimTime ()).to.be.equal (
          currentBlockTime + 105
        );

        expect (await creator.presaleTime ()).to.be.equal (
          currentBlockTime + 110
        );

        expect (await creator.publicTime ()).to.be.equal (
          currentBlockTime + 115
        );

        // backward time
        await creator.setMintTime (
          currentBlockTime + 100,
          currentBlockTime + 105,
          currentBlockTime + 110
        );

        expect (await creator.claimTime ()).to.be.equal (
          currentBlockTime + 100
        );
        expect (await creator.presaleTime ()).to.be.equal (
          currentBlockTime + 105
        );
        expect (await creator.publicTime ()).to.be.equal (
          currentBlockTime + 110
        );

        // testing edge case
        await creator.setMintTime (
          currentBlockTime + 1,
          currentBlockTime + 2,
          currentBlockTime + 3
        );
        expect (await creator.claimTime ()).to.be.equal (currentBlockTime + 1);
        expect (await creator.presaleTime ()).to.be.equal (
          currentBlockTime + 2
        );
        expect (await creator.publicTime ()).to.be.equal (currentBlockTime + 3);
      });

      it ('public sale time cannot be less than presale time', async () => {
        await expect (
          creator.setMintTime (
            currentBlockTime + 100,
            currentBlockTime + 110,
            currentBlockTime + 105
          )
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-public-time');

        // edge cases
        await expect (
          creator.setMintTime (
            currentBlockTime + 1,
            currentBlockTime + 2,
            currentBlockTime + 1
          )
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-public-time');

        await expect (
          creator.setMintTime (
            currentBlockTime + 1,
            currentBlockTime + 2,
            currentBlockTime + 0
          )
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-public-time');
      });

      it ('presale time cannot be less than the current block timestamp', async () => {
        await expect (
          creator.setMintTime (
            currentBlockTime + 1,
            currentBlockTime - 10,
            currentBlockTime + 10
          )
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-presale-time');

        await expect (
          creator.setMintTime (
            currentBlockTime + 1,
            currentBlockTime - 1,
            currentBlockTime
          )
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-presale-time');

        await expect (
          creator.setMintTime (
            currentBlockTime + 1,
            currentBlockTime - 2,
            currentBlockTime - 1
          )
        ).to.be.revertedWith ('RhapsodyCreatorGenerative/invalid-presale-time');
      });
    });
  });

  describe ('dev', () => {
    beforeEach (async () => {
      await creator.setMintTime (
        currentBlockTime + 100,
        currentBlockTime + 105,
        currentBlockTime + 110
      );
    });

    describe ('promotionMint', () => {
      it ('should be able to batch mint according to maxBatchSize', async () => {
        await expect (creator.promotionMint (params.amountForPromotion)).to
          .emit (creator, 'Created')
          .withArgs (admin.address, 0, 2)
          .withArgs (admin.address, 2, 2)
          .withArgs (admin.address, 4, 2)
          .withArgs (admin.address, 6, 2)
          .withArgs (admin.address, 8, 2)
          .withArgs (admin.address, 10, 2)
          .withArgs (admin.address, 12, 2)
          .withArgs (admin.address, 14, 2)
          .withArgs (admin.address, 16, 2)
          .withArgs (admin.address, 18, 2);
      });

      it ('should be able to batch mint according to maxBatchSize multiple times', async () => {
        await expect (creator.promotionMint (6)).to
          .emit (creator, 'Created')
          .withArgs (admin.address, 0, 2)
          .withArgs (admin.address, 2, 2)
          .withArgs (admin.address, 4, 2);

        await expect (creator.promotionMint (6)).to
          .emit (creator, 'Created')
          .withArgs (admin.address, 6, 2)
          .withArgs (admin.address, 8, 2)
          .withArgs (admin.address, 10, 2);

        await expect (creator.promotionMint (8)).to
          .emit (creator, 'Created')
          .withArgs (admin.address, 12, 2)
          .withArgs (admin.address, 14, 2)
          .withArgs (admin.address, 16, 2)
          .withArgs (admin.address, 18, 2);
      });

      it ('should only be able to mint max promotional nfts', async () => {
        creator.promotionMint (20);

        await expect (creator.promotionMint (1)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-promotion-supply'
        );
      });

      it ('should fail if not minting according to maxBatchSize', async () => {
        await expect (creator.promotionMint (1)).to.be.revertedWith (
          'RhapsodyCreatorGenerative/invalid-batch-multiple'
        );
      });

      it ('should only allow owner to mint', async () => {
        await expect (
          creator.connect (minterA).promotionMint (20)
        ).to.be.revertedWith ('Ownable: caller is not the owner');
      });

      describe ('totalSupply restrictions', () => {
        let creatorA;
        beforeEach (async () => {
          let collectionSize = 8;
          let amountForPromotion = 4;
          let maxPublicBatchPerAddress = 2;
          const RhapsodyCreator = await hre.ethers.getContractFactory (
            'RhapsodyCreatorGenerativeTest',
            admin,
            overrides
          );
          creatorA = await RhapsodyCreator.deploy (
            collectionSize,
            maxPublicBatchPerAddress,
            amountForPromotion,
            params.mintPrice
          );
          await creatorA.setMintRandomizerContract (randomizer.address);
          await randomizer.addDependency (creatorA.address);
          await creatorA.setPresaleMerkleRoot (presaleMerklized.root);
        });

        it ('should not allow to mint more than promotionMint if some nfts already minted', async () => {
          await expect (creatorA.promotionMint (4)).to
            .emit (creatorA, 'Created')
            .withArgs (admin.address, 0, 2)
            .withArgs (admin.address, 2, 2);

          await creatorA.setMintTime (
            currentBlockTime + 1,
            currentBlockTime + 2,
            currentBlockTime + 3
          );

          await creatorA
            .connect (minterA)
            .publicMint (2, {value: parseEther (0.333 * 2)});

          await expect (creatorA.promotionMint (4)).to.be.revertedWith (
            'RhapsodyCreatorGenerative/invalid-promotion-supply'
          );
        });

        it ('should only allow correct allocation of promotion mint even if late', async () => {
          await creatorA.setMintTime (
            currentBlockTime + 1,
            currentBlockTime + 2,
            currentBlockTime + 3
          );
          await creatorA
            .connect (minterA)
            .publicMint (2, {value: parseEther (0.333 * 2)});
          await expect (creatorA.promotionMint (2)).to
            .emit (creatorA, 'Created')
            .withArgs (admin.address, 2, 2);
          await expect (creatorA.promotionMint (2)).to.be.revertedWith (
            'RhapsodyCreatorGenerative/invalid-promotion-supply'
          );
        });
      });
    });
  });
});
