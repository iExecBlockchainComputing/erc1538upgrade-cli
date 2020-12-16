'use strict';

const { ethers } = require('ethers');
const prompts = require('prompts');


// const { abi } = require('/home/amxx/Work/iExec/code/PoCo/build/contracts/IexecMaintenanceExtraDelegate.json');
const { abi } = require('/home/amxx/Work/iExec/code/PoCo/build/contracts/TimelockController.json');



async function asyncReduce(functors)
{
	return await functors.reduce(
		async (promise, functor) => {
			const acc = await promise;
			acc.push(await functor());
			return acc;
		},
		Promise.resolve([])
	);
}

async function getParams(param, parentName = "")
{
	const name = param.name || parentName;
	if (param.baseType == 'array')
	{
		const { count } = await prompts({ type: 'number', name: 'count', message: `Length of "${name}[]"` });
		return await asyncReduce(Array(count).fill().map((_,i) => () => getParams(param.arrayChildren, `${name}[${i}]`)));
	}
	else
	{
		const { value } = await prompts({ type: 'text', name: 'value', message: name });
		return value;
	}
}

(async () => {
	const fragments = new ethers.utils.Interface(abi);

	// const x = await Promise.all(fragments.deploy.inputs.map(getParams));
	const x = await asyncReduce(fragments.deploy.inputs.map(fragment => () => getParams(fragment)))


	console.log(x)


})().catch(console.error)
