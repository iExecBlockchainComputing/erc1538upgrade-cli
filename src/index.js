'use strict';

const fs = require('fs');
const { ethers } = require('ethers');
const prompts = require('prompts');

const abi = new ethers.utils.Interface([
	'function updateContract(address,string,string)',
]);

(async () => {

	const responces = await prompts([
		// select module
		{
			type: 'text',
			name: 'artefact',
			message: 'Where is the truffle artefact',
			format: path => new ethers.utils.Interface(JSON.parse(fs.readFileSync(path)).abi),
			initial: 'example/IexecMaintenanceExtraDelegate.json',
		},
		// select methods
		{
			type: 'multiselect',
			name: 'fragments',
			message: 'Select functions',
			choices: (_, { artefact }) => Object.values(artefact.functions).map(fragment => ({ value: fragment.format() }))
		},
		// enable/disable
		{
			type: (_, { fragments }) => fragments.length ? 'select' : null,
			name: 'operation',
			message: 'Select operation',
			choices: [
				{ title: 'use existing instance', value: 1 },
				{ title: 'disable functions', value: 0 },
			],
		},
		// if enable → address of the module
		{
			type: (_, { operation }) => operation == 1 ? 'text' : null,
			name: 'module',
			message: 'Address of the module',
			validate: ethers.utils.isAddress,
		},
		// commit message
		{
			type: 'text',
			name: 'commit',
			message: 'Commit message',
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
			initial: '0x3eca1b216a7df1c7689aeb259ffb83adfb894e7f',
		},
		{
			type: (_, { execute }) => execute ? 'text' : null,
			name: 'pk',
			message: 'Private key of the owner',
		},
	]);

	const data = abi.encodeFunctionData(
		'updateContract(address,string,string)',
		[
			responces.module || ethers.constants.AddressZero,
			responces.fragments.map(x => x+';').join(''),
			responces.commit,
		]
	);

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
		console.log('To perform this update, send a transaction to your ERC1538Proxy with the following data field:');
		console.log(data);
	}

})().catch(console.error);
