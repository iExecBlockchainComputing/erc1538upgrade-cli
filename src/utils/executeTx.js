'use strict';

const { isAddress                           } = require('@ethersproject/address');
const { isValidName                         } = require('@ethersproject/hash');
const { getDefaultProvider, JsonRpcProvider } = require('@ethersproject/providers');
const { Wallet                              } = require('@ethersproject/wallet');
const { LedgerSigner                        } = require('@ethersproject/hardware-wallets');
const isUrl   = require('is-url');
const prompts = require('prompts');

module.exports = async function(txRequest = {})
{
	const { execute, provider, to, signer } = await prompts([{
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
		format: chain => chain && getDefaultProvider(chain),
	},{
		type: (_, { execute, provider }) => execute && !provider && 'text',
		name: 'provider',
		message: 'Enter blockchain endpoint',
		initial: process.env.CHAIN,
		validate: isUrl,
		format: endpoint => new JsonRpcProvider(endpoint),
	},{
		type: (_, { execute }) => execute && !txRequest.to && 'text',
		name: 'to',
		message: 'Address of the instance',
		validate: address => isAddress(address) || isValidName(address),
	},{
		type: (_, { execute }) => execute && 'select',
		name: 'signertype',
		message: 'Select your wallet type',
		choices: [
			{ title: 'Private key',            value: 'wallet' },
			{ title: 'Ledger hardware wallet', value: 'ledger' },
		],
	},{
		type: (_, { signertype }) => signertype == 'wallet' && 'text',
		name: 'signer',
		message: 'Private key of the wallet',
		initial: process.env.MNEMONIC,
		validate: pk => /^0x[0-9a-z]{64}$/.exec(pk),
		format: (pk, { provider }) => new Wallet(pk, provider),
	},{
		type: (_, { signertype }) => signertype == 'ledger' && 'text',
		name: 'signer',
		message: 'Path',
		initial: 'm/44\'/60\'/0\'/0/0',
		format: (path, { provider }) => new LedgerSigner(provider, 'hid', path),
	}]);

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
