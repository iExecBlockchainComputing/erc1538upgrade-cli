'use strict';

const fs              = require('fs');
const prompts         = require('prompts');
const { Interface   } = require('@ethersproject/abi');
const { HashZero    } = require('@ethersproject/constants');
const executeTxCli    = require('./utils/executeTxCli.js');
const getFunctionArgs = require('./utils/getParams.js');
const { bytes32     } = require('./utils/solidityTypes.js');

(async () => {
	const factory = (new Interface([ 'function createContract(bytes,bytes32)' ]));
	const { artefact } = await prompts({
		type: 'text',
		name: 'artefact',
		message: 'Where is the truffle artefact',
		validate: fs.existsSync,
		format: path => JSON.parse(fs.readFileSync(path)),
		initial: 'example/TimelockController.json',
	});

	if (!artefact || !artefact.abi || !artefact.bytecode) { throw 'Invalid artefact'; }

	const fragments = new Interface(artefact.abi);
	const params = await getFunctionArgs(fragments.deploy);
	const { salt, confirm } = await prompts([{
		...bytes32,
		name: 'salt',
		message: 'Salt',
		initial: HashZero,
	},{
		type: 'confirm',
		name: 'confirm',
		message: 'Confirm deployment',
	}]);

	if (!confirm) { throw 'Aborted'; }

	await executeTxCli({
		to: '0xfAC000a12dA42B871c0AaD5F25391aAe62958Db1',
		data: artefact.bytecode + fragments.encodeDeploy(params).slice(2),
	});

})().catch(console.error)
