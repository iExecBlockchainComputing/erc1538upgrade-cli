'use strict';

const fs = require('fs');
const { ethers } = require('ethers');
const prompts = require('prompts');

(async () => {

	const responces = await prompts([
		// select module
		{
			type: 'text',
			name: 'artefact',
			message: 'Where is the truffle artefact',
			format: path => JSON.parse(fs.readFileSync(path)),
		},
		// select methods
		{
			type: 'multiselect',
			name: 'fragments',
			message: 'Select functions',
			choices: (prev, values) => values.artefact.abi.filter(({ type }) => type == 'function').map(fragment => ethers.utils.FunctionFragment.fromObject(fragment).format()).map(format => ({ value: format }))
		},
		// enable/disable
		{
			type: prev => prev.length ? 'select' : null,
			name: 'operation',
			message: 'Select operation',
			choices: (prev, values) => [
				{ title: 'use existing instance', value: 1 },
				{ title: 'disable functions', value: 0 },
			],
		},
		// if enable → address of the module
		{
			type: prev => prev == 1 ? 'text' : null,
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
			type: (prev, values) => values.execute ? 'select' : null,
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
			type: (prev, values) => values.execute && !values.chain ? 'text' : null,
			name: 'chain',
			message: 'Enter blockchain endpoint',
		},
		// if execute → instance
		{
			type: (prev, values) => values.execute ? 'text' : null,
			name: 'instance',
			message: 'Address of the deployment',
			// validate: ethers.utils.isAddress, // can be ENS
		},
		{
			type: (prev, values) => values.execute ? 'text' : null,
			name: 'pk',
			message: 'Private key of the owner',
		},
	]);

	const abi = new ethers.utils.Interface([ 'function updateContract(address,string,string)' ]);
	const args = [
		responces.module || ethers.constants.AddressZero,
		responces.fragments.map(x => x+';').join(''),
		responces.commit,
	];

	if (responces.execute)
	{
		const provider = ethers.getDefaultProvider(responces.chain);
		const signer   = new ethers.Wallet(responces.pk, provider);
		const contract = new ethers.Contract(responces.instance, abi, signer);
		const receipt  = await contract.updateContract(...args);
		await receipt.wait();
		console.log('done');
	}
	else
	{
		const data = abi.encodeFunctionData('updateContract(address,string,string)', args);
		console.log('To perform this update, send a transaction to your ERC1538Proxy with the following data field:');
		console.log(data);
	}

})();
