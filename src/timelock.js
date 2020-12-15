'use strict';

const fs = require('fs');
const { ethers } = require('ethers');
const prompts = require('prompts');


const abi = new ethers.utils.Interface([
	'function hashOperation(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)',
	'function hashOperationBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas, bytes32 predecessor, bytes32 salt)',
	'function schedule(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt, uint256 delay)',
	'function scheduleBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas, bytes32 predecessor, bytes32 salt, uint256 delay)',
	'function cancel(bytes32 id)',
	'function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)',
	'function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas, bytes32 predecessor, bytes32 salt)',
]);
const subtx = /^(?<address>0x[0-9a-zA-Z]{40})(:(?<data>0x([0-9a-z]{2})*))?(@(?<value>\d*))?$/;
const bytes32 = /^0x[0-9a-z]{64}?$/;

(async () => {

	const responces = await prompts([
		{
			type: 'select',
			name: 'operation',
			message: 'Select the operation',
			choices: [
				{ title: 'schedule', value: 0 },
				{ title: 'execute', value: 1 },
				{ title: 'cancel', value: 2 },
			],
		},
		{
			type: (_, { operation }) => operation == 0 || operation == 1 ? 'text' : null,
			name: 'txs',
			message: 'All sub-transactions (see readme for format)',
			validate: input => input.split(',').filter(Boolean).every(arg => subtx.exec(arg)),
			format: input => input.split(',').filter(Boolean).map(arg => subtx.exec(arg).groups),
		},
		{
			type: (_, { operation }) => operation == 0 || operation == 1 ? 'text' : null,
			name: 'salt',
			message: 'Salt',
			initial: (_, { operation }) => operation == 0 && ethers.utils.hexlify(ethers.utils.randomBytes(32)),
			validate: input => bytes32.exec(input)
		},
		{
			type: (_, { operation }) => operation == 0 ? 'number' : null,
			name: 'delay',
			message: 'Delay',
			initial: 604800,
		},
		{
			type: (_, { operation }) => operation == 2 ? 'text' : null,
			name: 'id',
			message: 'Id',
			validate: input => bytes32.exec(input)
		},
		// execute/encode
		{
			type: 'select',
			name: 'execute',
			message: 'When',
			choices: [
				{ title: 'Encode for later', value: false },
				{ title: 'Execute now', value: true },
			],
		},
		// if execute → blockchain
		{
			type: (_, { execute }) => execute ? 'select' : null,
			name: 'chain',
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
		},
		// if execute → custom blockchain
		{
			type: (_, { execute, chain }) => execute && !chain ? 'text' : null,
			name: 'chain',
			message: 'Enter blockchain endpoint',
		},
		// if execute → instance
		{
			type: (_, { execute }) => execute ? 'text' : null,
			name: 'instance',
			message: 'Address of the deployment',
			// validate: ethers.utils.isAddress, // can be ENS
		},
		{
			type: (_, { execute }) => execute ? 'text' : null,
			name: 'pk',
			message: 'Private key of the owner',
		},
	]);

	const data =
		(responces.operation == 0 && responces.length == 1) ?
			abi.encodeFunctionData(
				'schedule(address,uint256,bytes,bytes32,bytes32,uint256)',
				[
					responces.txs[0].address,
					responces.txs[0].value || 0,
					responces.txs[0].data || '0x',
					ethers.constants.HashZero,
					responces.salt,
					responces.delay,
				]
			)
		: (responces.operation == 0) ?
			abi.encodeFunctionData(
				'scheduleBatch(address[],uint256[],bytes[],bytes32,bytes32,uint256)',
				[
					responces.txs.map(({ address }) => address),
					responces.txs.map(({ value }) => value || 0),
					responces.txs.map(({ data }) => data || '0x'),
					ethers.constants.HashZero,
					responces.salt,
					responces.delay,
				]
			)
		: (responces.operation == 1 && responces.length == 1) ?
			abi.encodeFunctionData(
				'execute(address,uint256,bytes,bytes32,bytes32)',
				[
					responces.txs[0].address,
					responces.txs[0].value || 0,
					responces.txs[0].data || '0x',
					ethers.constants.HashZero,
					responces.salt,
				]
			)
		: (responces.operation == 1) ?
			abi.encodeFunctionData(
				'executeBatch(address[],uint256[],bytes[],bytes32,bytes32)',
				[
					responces.txs.map(({ address }) => address),
					responces.txs.map(({ value }) => value || 0),
					responces.txs.map(({ data }) => data || '0x'),
					ethers.constants.HashZero,
					responces.salt,
				]
			)
		: (responces.operation == 2) ?
			abi.encodeFunctionData(
				'cancel(bytes32)',
				[
					responces.id,
				]
			)
		: null;

	console.log(data);
	if (responces.execute)
	{
		const provider = ethers.getDefaultProvider(responces.chain);
		const signer   = new ethers.Wallet(responces.pk, provider);
		const receipt  = await signer.sendTransaction({ to: responces.instance, data });
		await receipt.wait();
		console.log('done');
	}
	else
	{
		console.log('To perform this operation, send a transaction to your timelock with the following data field:');
		console.log(data);
	}

})().catch(console.error);

/*
0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x10,0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x20,0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x30,0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x40
*/
