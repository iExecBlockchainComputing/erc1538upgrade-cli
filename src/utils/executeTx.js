'use strict';

const { ethers } = require('ethers');
const prompts = require('prompts');

const questions = [{
	type: 'select',
	name: '___execute',
	message: 'When',
	choices: [
		{ title: 'Execute now', value: true },
		{ title: 'Encode for later', value: false },
	],
},{
	type: (_, { ___execute }) => ___execute ? 'select' : null,
	name: '___chain',
	message: 'Select your blockchain',
	choices: [
		{ value: 'mainnet' },
		{ value: 'rinkeby' },
		{ value: 'ropsten' },
		{ value: 'goerli' },
		{ value: 'kovan' },
		{ value: 'http://localhost:8545' },
		{ title: 'custom endpoint', value: null },
	],
},{
	type: (_, { ___execute, ___chain }) => ___execute && !___chain ? 'text' : null,
	name: '___chain',
	message: 'Enter blockchain endpoint',
	initial: process.env.CHAIN,
},{
	type: (_, { ___execute }) => ___execute ? 'text' : null,
	name: '___instance',
	message: 'Address of the deployment',
	// validate: ethers.utils.isAddress, // can be ENS
},{
	type: (_, { ___execute }) => ___execute ? 'text' : null,
	name: '___pk',
	message: 'Private key of the owner',
	initial: process.env.MNEMONIC,
}];

module.exports = async function(tx = {})
{
	const responces = await prompts([ ...questions ]);
	if (responces.___execute)
	{
		const provider = ethers.getDefaultProvider(responces.___chain);
		const signer   = new ethers.Wallet(responces.___pk, provider);
		const receipt  = await signer.sendTransaction({ to: responces.___instance, ...tx });
		await receipt.wait();
		console.log('done');
	}
	else
	{
		console.log('To perform this update, send a transaction to your instance with the following fields:');
		console.log(tx);
	}
}
