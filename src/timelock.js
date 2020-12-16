'use strict';

const { ethers } = require('ethers');
const cliWithSigner = require('./utils/wrapper.js');

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
	await cliWithSigner([
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
			message: 'All sub-calls (see readme for format)',
			validate: input => input.split(',').filter(Boolean).every(arg => subtx.exec(arg)),
			format: input => input.split(',').filter(Boolean).map(arg => subtx.exec(arg).groups),
		},
		{
			type: (_, { operation }) => operation == 0 || operation == 1 ? 'text' : null,
			name: 'predecessor',
			message: 'Predecessor',
			initial: ethers.constants.HashZero,
			validate: input => bytes32.exec(input)
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
	], (responces) =>
		(responces.operation == 0 && responces.txs.length == 0) ?
			'0x'
		: (responces.operation == 0 && responces.txs.length == 1) ?
			abi.encodeFunctionData(
				'schedule(address,uint256,bytes,bytes32,bytes32,uint256)',
				[
					responces.txs[0].address,
					responces.txs[0].value || 0,
					responces.txs[0].data || '0x',
					responces.predecessor,
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
					responces.predecessor,
					responces.salt,
					responces.delay,
				]
			)
		: (responces.operation == 1 && responces.txs.length == 0) ?
			'0x'
		: (responces.operation == 1 && responces.txs.length == 1) ?
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
		: null
	);

})().catch(console.error);

/*
0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x10,0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x20,0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x30,0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f:0x40
*/
