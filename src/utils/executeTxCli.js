'use strict';

const prompts                                 = require('prompts');
const isUrl                                   = require('is-url');
const { Provider                            } = require('@ethersproject/abstract-provider');
const { Signer                              } = require('@ethersproject/abstract-signer');
const { isAddress                           } = require('@ethersproject/address');
const { isValidName                         } = require('@ethersproject/hash');
const { getDefaultProvider, JsonRpcProvider } = require('@ethersproject/providers');
const { Wallet                              } = require('@ethersproject/wallet');
const { LedgerSigner                        } = require('@ethersproject/hardware-wallets');


async function executeTxCli(txRequest = {}, providerOrSigner = null)
{
	prompts.override({
		to: txRequest.to,
		provider:
			providerOrSigner instanceof Provider
			? providerOrSigner
			: providerOrSigner instanceof Signer
			? providerOrSigner.provider
			: undefined,
		signer:
			providerOrSigner instanceof Signer
			? providerOrSigner
			: undefined,
	});

	const { execute, provider, signer, to, confirm } = await prompts([{
		type: 'select',
		name: 'execute',
		message: 'When',
		choices: [
			{ title: 'Execute now',      value: true  },
			{ title: 'Encode for later', value: false },
		],
	},{
		type: (_, { execute }) => execute && 'select',
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
		type: (_, { execute, provider }) => execute && !provider && 'text',
		name: 'provider',
		message: 'Enter blockchain endpoint',
		initial: process.env.CHAIN,
		validate: isUrl,
		format: endpoint => new JsonRpcProvider(endpoint),
	},{
		type: (_, { execute }) => execute && 'text',
		name: 'to',
		message: 'Address of the target',
		validate: address => isAddress(address) || isValidName(address),
	},{
		type: (_, { execute }) => execute && 'select',
		name: 'signer',
		message: 'Select your wallet type',
		choices: (_, { provider}) => [
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
	},{
		type: 'confirm',
		name: 'confirm',
		message: 'Confirm',
	}]);

	if (confirm == undefined) throw 'Aborted';

	if (execute)
	{
		const tx      = await signer.sendTransaction({ to, ...txRequest });
		const receipt = await tx.wait();
		console.log('done');
		return receipt;
	}
	else
	{
		console.log('To perform this update, send a transaction to your instance with the following fields:');
		console.log(txRequest);
		return null;
	}
}

module.exports = executeTxCli;
