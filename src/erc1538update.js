'use strict';

const fs = require('fs');
const { ethers } = require('ethers');
const prompts = require('prompts');
const cliExecuteTx = require('./utils/executeTx.js');

const abi = new ethers.utils.Interface([
	'function updateContract(address,string,string)',
]);

(async () => {
	const { artefact, fragments, operation, module, commit } = await prompts([{
		type: 'text',
		name: 'artefact',
		message: 'Where is the truffle artefact',
		format: path => new ethers.utils.Interface(JSON.parse(fs.readFileSync(path)).abi),
		initial: 'example/IexecMaintenanceExtraDelegate.json',
	},{
		type: 'multiselect',
		name: 'fragments',
		message: 'Select functions',
		choices: (_, { artefact }) => Object.values(artefact.functions).map(fragment => ({ value: fragment.format() }))
	},{
		type: (_, { fragments }) => fragments.length ? 'select' : null,
		name: 'operation',
		message: 'Select operation',
		choices: [
			{ title: 'use existing instance', value: 1 },
			{ title: 'disable functions', value: 0 },
		],
	},{
		type: (_, { operation }) => operation == 1 ? 'text' : null,
		name: 'module',
		message: 'Address of the module',
		validate: ethers.utils.isAddress,
	},{
		type: 'text',
		name: 'commit',
		message: 'Commit message',
	}]);

	await cliExecuteTx({
		data: abi.encodeFunctionData(
			'updateContract(address,string,string)',
			[
				module || ethers.constants.AddressZero,
				fragments.map(x => x+';').join(''),
				commit,
			]
		)
	});
})().catch(console.error);
