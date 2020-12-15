'use strict';

const fs = require('fs');
const { ethers } = require('ethers');
const cliWithSigner = require('./utils/wrapper.js');

const abi = new ethers.utils.Interface([
	'function updateContract(address,string,string)',
]);

(async () => {
	await cliWithSigner([
		{
			type: 'text',
			name: 'artefact',
			message: 'Where is the truffle artefact',
			format: path => new ethers.utils.Interface(JSON.parse(fs.readFileSync(path)).abi),
			initial: 'example/IexecMaintenanceExtraDelegate.json',
		},
		{
			type: 'multiselect',
			name: 'fragments',
			message: 'Select functions',
			choices: (_, { artefact }) => Object.values(artefact.functions).map(fragment => ({ value: fragment.format() }))
		},
		{
			type: (_, { fragments }) => fragments.length ? 'select' : null,
			name: 'operation',
			message: 'Select operation',
			choices: [
				{ title: 'use existing instance', value: 1 },
				{ title: 'disable functions', value: 0 },
			],
		},
		{
			type: (_, { operation }) => operation == 1 ? 'text' : null,
			name: 'module',
			message: 'Address of the module',
			validate: ethers.utils.isAddress,
		},
		{
			type: 'text',
			name: 'commit',
			message: 'Commit message',
		},
	], (responces) =>
		abi.encodeFunctionData(
			'updateContract(address,string,string)',
			[
				responces.module || ethers.constants.AddressZero,
				responces.fragments.map(x => x+';').join(''),
				responces.commit,
			]
		)
	);

})().catch(console.error);
