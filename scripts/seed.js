const { ethers } = require('hardhat');
const config = require('../src/config.json');
// const hre = require('hardhat');

// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.

const tokens = (n) => {
  return ethers.utils.parseUnits(n.toString(), 'ether');
};

// eslint-disable-next-line no-unused-vars
const ether = tokens;

async function main() {
  console.log(`Fetching accounts & network...\n`);

  const accounts = await ethers.getSigners();
  const funder = accounts[0];
  const investor1 = accounts[1];
  const investor2 = accounts[2];
  const investor3 = accounts[3];
  const recipient = accounts[4];

  let transaction;

  // Fetch network
  const { chainId } = await ethers.provider.getNetwork();

  // Fetch deployed token
  console.log(`Fetching token and transferring to accounts...\n`);
  const token = await ethers.getContractAt('Token', config[chainId].token.address);
  console.log(`Token fetched: ${token.address}\n`);

  // Send tokens to investors - each one gets 20%
  transaction = await token.transfer(investor1.address, tokens(200000));
  await transaction.wait();

  transaction = await token.transfer(investor2.address, tokens(200000));
  await transaction.wait();

  transaction = await token.transfer(investor3.address, tokens(200000));
  await transaction.wait();

  // Fetch deployed dao
  console.log(`Fetching dao... \n`);
  const dao = await ethers.getContractAt('DAO', config[chainId].dao.address);
  console.log(`DAO fetched: ${dao.address}\n`);

  // Funder sends Ether to DAO treasury
  transaction = await funder.sendTransaction({ to: dao.address, value: ether(1000) });
  await transaction.wait();
  console.log(`Sent funds to dao treasury...\n`);

  for (var index = 0; index < 3; index++) {
    // Create proposal
    transaction = await dao.connect(investor1).createProposal(`Proposal ${index + 1}`, ether(100), recipient.address);
    await transaction.wait();

    // Vote 1
    transaction = await dao.connect(investor1).vote(index + 1);
    await transaction.wait();

    // Vote 2
    transaction = await dao.connect(investor2).vote(index + 1);
    await transaction.wait();

    // Vote 3
    transaction = await dao.connect(investor3).vote(index + 1);
    await transaction.wait();

    // Finalize
    transaction = await dao.connect(investor1).finalizeProposal(index + 1);
    await transaction.wait();

    console.log(`Created and Finalized Proposal ${index + 1}\n`);
  }

  console.log(`Creating one more proposal...\n`);

  // Create one more proposal
  transaction = await dao.connect(investor1).createProposal(`Proposal 4`, ether(100), recipient.address);
  await transaction.wait();

  // Vote 1
  transaction = await dao.connect(investor2).vote(4);
  await transaction.wait();

  // Vote 2
  transaction = await dao.connect(investor3).vote(4);
  await transaction.wait();

  console.log(`Finished.\n`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
