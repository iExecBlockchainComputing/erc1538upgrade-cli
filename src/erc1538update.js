'use strict';

const fs              = require('fs');
const prompts         = require('prompts');
const { Interface   } = require('@ethersproject/abi');
const { isAddress   } = require('@ethersproject/address');
const { AddressZero } = require('@ethersproject/constants');
const executeTxCli    = require('./utils/executeTxCli.js');

const abi = new Interface([
	'function updateContract(address,string,string)',
]);

(async () => {
	const { artefact, fragments, operation, module, commit } = await prompts([{
		type: 'text',
		name: 'artefact',
		message: 'Where is the truffle artefact',
		format: path => new Interface(JSON.parse(fs.readFileSync(path)).abi),
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
		validate: isAddress,
	},{
		type: 'text',
		name: 'commit',
		message: 'Commit message',
	}]);

	await executeTxCli({
		data: abi.encodeFunctionData(
			'updateContract(address,string,string)',
			[
				module || AddressZero,
				fragments.map(x => x+';').join(''),
				commit,
			]
		)
	});
})().catch(console.error);
