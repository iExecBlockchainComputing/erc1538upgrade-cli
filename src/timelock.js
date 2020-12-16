'use strict';

const prompts         = require('prompts');
const { Interface   } = require('@ethersproject/abi');
const { isAddress   } = require('@ethersproject/address');
const { hexlify     } = require('@ethersproject/bytes');
const { HashZero    } = require('@ethersproject/constants');
const { randomBytes } = require('@ethersproject/random');
const executeTxCli    = require('./utils/executeTxCli.js');

const abi = new Interface([
	'function hashOperation(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)',
	'function hashOperationBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas, bytes32 predecessor, bytes32 salt)',
	'function schedule(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt, uint256 delay)',
	'function scheduleBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas, bytes32 predecessor, bytes32 salt, uint256 delay)',
	'function cancel(bytes32 id)',
	'function execute(address target, uint256 value, bytes calldata data, bytes32 predecessor, bytes32 salt)',
	'function executeBatch(address[] calldata targets, uint256[] calldata values, bytes[] calldata datas, bytes32 predecessor, bytes32 salt)',
]);
const bytes32 = /^0x[0-9a-z]{64}$/;
const bytes = /^0x([0-9a-z]{2})*$/;

(async () => {
	const { operation } = await prompts({
		type: 'select',
		name: 'operation',
		message: 'Select the operation',
		choices: [
			{ title: 'schedule', value: 0 },
			{ title: 'execute', value: 1 },
			{ title: 'cancel', value: 2 },
		],
	});

	const { count } = await prompts({
		type: (operation == 0 || operation == 1) && 'number',
		name: 'count',
		message: 'Number of sub-calls',
		initial: 1,
		min: 1,
	});

	const subcalls = count && await Array(count).fill().reduce(
		async (promise, _, i) => {
			const acc = await promise;
			acc.push(await prompts([{
				type: 'text',
				name: 'address',
				message: `Address for subcall[${i}]`,
				validate: isAddress,
			},{
				type: 'text',
				name: 'data',
				message: `Data for subcall[${i}]`,
				initial: '0x',
				validate: input => bytes.exec(input),
			}, {
				type: 'number',
				name: 'value',
				message: `Value for subcall[${i}] (in wei)`,
				initial: 0,
				min: 0,
			}]));
			return acc;
		},
		Promise.resolve([])
	);

	const { predecessor, salt, delay, id } = await prompts([{
		type: (operation == 0 || operation == 1) && 'text',
		name: 'predecessor',
		message: 'Predecessor',
		initial: HashZero,
		validate: input => bytes32.exec(input)
	},{
		type: (operation == 0 || operation == 1) && 'text',
		name: 'salt',
		message: 'Salt',
		initial: operation == 0 && hexlify(randomBytes(32)),
		validate: input => bytes32.exec(input)
	},{
		type: operation == 0 && 'number',
		name: 'delay',
		message: 'Delay',
		initial: 604800,
		min: 0,
	},{
		type: operation == 2 && 'text',
		name: 'id',
		message: 'Id',
		validate: input => bytes32.exec(input)
	}]);

	await executeTxCli({
		value: (operation == 1) ? subcalls.reduce((acc, { value }) => acc + (value || 0), 0) : 0,
		data:
			(operation == 0 && subcalls.length == 0) ?
				'0x'
			: (operation == 0 && subcalls.length == 1) ?
				abi.encodeFunctionData(
					'schedule(address,uint256,bytes,bytes32,bytes32,uint256)',
					[
						subcalls[0].address,
						subcalls[0].value || 0,
						subcalls[0].data || '0x',
						predecessor,
						salt,
						delay,
					]
				)
			: (operation == 0) ?
				abi.encodeFunctionData(
					'scheduleBatch(address[],uint256[],bytes[],bytes32,bytes32,uint256)',
					[
						subcalls.map(({ address }) => address),
						subcalls.map(({ value }) => value || 0),
						subcalls.map(({ data }) => data || '0x'),
						predecessor,
						salt,
						delay,
					]
				)
			: (operation == 1 && subcalls.length == 0) ?
				'0x'
			: (operation == 1 && subcalls.length == 1) ?
				abi.encodeFunctionData(
					'execute(address,uint256,bytes,bytes32,bytes32)',
					[
						subcalls[0].address,
						subcalls[0].value || 0,
						subcalls[0].data || '0x',
						predecessor,
						salt,
					]
				)
			: (operation == 1) ?
				abi.encodeFunctionData(
					'executeBatch(address[],uint256[],bytes[],bytes32,bytes32)',
					[
						subcalls.map(({ address }) => address),
						subcalls.map(({ value }) => value || 0),
						subcalls.map(({ data }) => data || '0x'),
						predecessor,
						salt,
					]
				)
			: (operation == 2) ?
				abi.encodeFunctionData(
					'cancel(bytes32)',
					[
						id,
					]
				)
			: null,
	});

})().catch(console.error);
