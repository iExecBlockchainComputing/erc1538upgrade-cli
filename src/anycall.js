'use strict';

const fs                                      = require('fs');
const isUrl                                   = require('is-url');
const prompts                                 = require('prompts');
const yargs                                   = require('yargs');
const { Interface                           } = require('@ethersproject/abi');
const { isAddress                           } = require('@ethersproject/address');
const { BigNumber                           } = require('@ethersproject/bignumber');
const { Contract                            } = require('@ethersproject/contracts');
const { isValidName                         } = require('@ethersproject/hash');
const { getDefaultProvider, JsonRpcProvider } = require('@ethersproject/providers');
const getFunctionArgs                         = require('./utils/getParams.js');

const argv = yargs.option('address', { string: true }).argv;
prompts.override(argv);

function formatResult(value) {
	if (BigNumber.isBigNumber(value)) {
		return value.toString();
	} else if (Array.isArray(value)) {
		return Object.keys(value).reduce((acc, key) => Object.assign(acc, { [key]: formatResult(value[key]) }), Array());
	} else {
		return value;
	}
}

(async () => {
	/****************************************************************************
	 *                              Load Artefact                               *
	 ****************************************************************************/
	const { artefact } = await prompts({
		type: 'text',
		name: 'artefact',
		message: 'Where is the truffle artefact',
		validate: fs.existsSync,
		format: path => JSON.parse(fs.readFileSync(path)),
		initial: 'example/TimelockController.json',
	});
	if (artefact == undefined) { throw 'Aborted'; }
	if (!artefact.abi)         { throw 'Invalid artefact'; }
	if (!artefact.networks)    { throw 'Invalid artefact'; }

	const abi = new Interface(artefact.abi);

	/****************************************************************************
	 *                             Select function                              *
	 ****************************************************************************/
	const { selector } = await prompts({
		type: 'select',
		name: 'selector',
		message: 'Function to call',
		choices: Object.keys(abi.functions).map(value => ({ value })),
	});
	if (abi.functions[selector] == undefined) { throw 'Aborted'; }

	const fragment = abi.functions[selector];
	const readonly = [ 'view', 'pure' ].includes(fragment.stateMutability);
	const params   = argv.args && JSON.parse(argv.args) || await getFunctionArgs(fragment);

	/****************************************************************************
	 *                             Select operation                             *
	 ****************************************************************************/
	const { execute } = await prompts({
		type: 'select',
		name: 'execute',
		message: 'When',
		choices: [
			{ title: 'Execute now',      value: true  },
			{ title: 'Encode for later', value: false },
		],
	});
	if (execute == undefined) { throw 'Aborted'; }

	if (!execute)
	{
		const data = abi.encodeFunctionData(selector, params)
		console.log('Encoded function call:', data)
		return
	}

	/****************************************************************************
	 *                             Select provider                              *
	 ****************************************************************************/
	const { provider } = await prompts([{
		type: 'select',
		name: 'provider',
		message: 'Select your blockchain',
		choices: [
			{ value: 'mainnet'                      },
			{ value: 'rinkeby'                      },
			{ value: 'ropsten'                      },
			{ value: 'goerli'                       },
			{ value: 'kovan'                        },
			{ value: 'http://localhost:8545'        },
			{ title: 'custom endpoint', value: null },
		],
		format: (chain) => typeof chain == 'string' ? getDefaultProvider(chain) : chain
	},{
		type: (_, { provider }) => !provider && 'text',
		name: 'provider',
		message: 'Enter blockchain endpoint',
		initial: process.env.CHAIN,
		validate: isUrl,
		format: endpoint => new JsonRpcProvider(endpoint),
	}]);
	if (provider == undefined) { throw 'Aborted'; }

	/****************************************************************************
	 *                              Select address                              *
	 ****************************************************************************/
	const { chainId } = await provider.getNetwork()
	const { address: defaultAddress } = (artefact.networks[chainId] || {});
	const { address } = await prompts([{
		type: defaultAddress && 'select',
		name: 'address',
		message: 'Select instance',
		choices: [
			{ value: defaultAddress },
			{ title: 'other instance', value: null },
		],
	},{
		type: (_, { address }) => !address && 'text',
		name: 'address',
		message: 'Select instance',
		initial: 'timelock.iexec.eth',
		validate: address => isAddress(address) || isValidName(address),
	}]);
	if (address == undefined) { throw 'Aborted'; }

	const contract = new Contract(address, abi, provider);

	/****************************************************************************
	 *                              Select signer                               *
	 ****************************************************************************/
	const { signer } = await prompts([{
		type: !readonly && 'select',
		name: 'signer',
		message: 'Select your wallet type',
		choices: [
			{ title: 'Private key',    value: 'wallet'                                                    },
			{ title: 'JsonRpc signer', value: 'jsonrpc', disabled: !(provider instanceof JsonRpcProvider) },
			{ title: 'Ledger',         value: 'ledger'                                                    },
		],
	},{
		type: (_, { signer }) => signer == 'wallet' && 'text',
		name: 'signer',
		message: 'Private key of the wallet',
		initial: process.env.MNEMONIC,
		validate: pk => /^0x[0-9a-z]{64}$/.exec(pk),
		format: (pk, { provider }) => new Wallet(pk, provider),
	},{
		type: (_, { signer }) => signer == 'jsonrpc' && 'number',
		name: 'signer',
		message: 'Index of the account',
		initial: 0,
		min: 0,
		format: (index, { provider }) => provider.getSigner(index),
	},{
		type: (_, { signer }) => signer == 'ledger' && 'text',
		name: 'signer',
		message: 'Path',
		initial: 'm/44\'/60\'/0\'/0/0',
		format: (path, { provider }) => new LedgerSigner(provider, 'hid', path),
	}]);
	if (!readonly && signer == undefined) { throw 'Aborted'; }

	/****************************************************************************
	 *                                 Execute                                  *
	 ****************************************************************************/
	const { confirm } = await prompts({
		type: !readonly && 'confirm',
		name: 'confirm',
		message: 'Confirm',
	});
	if (!readonly && !confirm) throw 'Aborted';

	switch (fragment.stateMutability) {
		case 'view':
		case 'pure':
			console.log({ result: formatResult(await contract[selector](...params)) });
			break;
		case 'payable':
			// TODO, add value
		case 'nonpayable':
			const tx      = await contract.connect(signer)[selector](...params);
			const receipt = await tx.await();
			console.log({ receipt });
			break;
	}

})().catch(console.error)
