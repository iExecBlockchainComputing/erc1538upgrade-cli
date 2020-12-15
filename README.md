How to use?
===

Install
---
- `npm install`

Upgrade an ERC1538 Proxy
---

- `npm run start:erc1538update`
- follow the instructions

Interact with a timelock
---

- `npm run start:timelock`
- follow the instructions

The sub-calls must be given as a single (comma-separated) string of instruction. Each instruction must be encoded as `<address>(:<data>)?(@<value>)?` with
- `<address>`: the address of the target contract (or eoa)
- `<data>`: an optional data field (encoded function call when calling smart contracts)
- `<value>`: an optional value (in wei) to pass along the call.


As an exercice, lets unwrap this subcalls.
```
0x607F4C5BB672230e8672085532f7e901544a7375:0xa9059cbb00000000000000000000000025229cfe0bd20e97aafcfaf82c57bb681c21db90000000000000000000000000000000000000000000000000000000e8d4a51000,0x25229Cfe0Bd20e97aAFCFaf82c57Bb681c21DB90@1000000000000000000
```

We have 2 sub calls:
- The first one is a call to address `0x607F4C5BB672230e8672085532f7e901544a7375` (the RLC smart contract) that transfers `e8d4a51000` (1000*10^9) nRLC to address `0x25229Cfe0Bd20e97aAFCFaf82c57Bb681c21DB90`
- The second one is a direct transfer to address `0x25229Cfe0Bd20e97aAFCFaf82c57Bb681c21DB90` with `1000000000000000000` wei of value and no data.
