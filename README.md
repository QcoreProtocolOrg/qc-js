# qc-js
qc-js is a JavaScript library for QC Wallet.

## Installation

[![NPM Stats](https://nodei.co/npm/qc-js.png?downloads=true)](https://npmjs.org/package/qc-js)

### NPM
```bash
npm npm i --save qc-js
```

### Yarn
```bash
yarn add qc-js
```

## Usage

### Import
```js
import { QcApi } from 'qc-js';
```

### `QcApi` class

`QcApi` is the single interface to use `qtum-light-js`.

```js
const qcApi = new QcApi();
```

Once we create the instance of `QcApi`, then we can use it to interact with Qtum Light Wallet.

#### `isQcWalletInstalled` method
`isQcWalletInstalled` is used to get the installation status of Qtum Light Wallet

```js
const installed = qcApi.isQcWalletInstalled();
```

#### `getCurrentAddress` method

`getCurrentAddress` is used to get current active wallet address, it returns the active wallet address or null if the wallet is locked.

```js
const address = await qcApi.getCurrentAddress();
```

#### `queryAccount` method

`queryAccount(address)` is used to get the account information. It returns a `Promise`.

```js
const account = await qcApi.queryAccount(address);
```

#### `queryTransaction` method

`queryTransaction(tx)` is used to get the transaction result. It returns a `Promise` with the transaction information. It throw an error if there is any error like network issue.

```js
const result = await qcApi.queryTransaction(tx);
```

#### `queryConfirmation` method

`queryConfirmation(tx)` is used to get the confirmation. It returns a `Promise` with the confirmation information. It will keep retrying every `period` time until the blockchain finish or fail the confirmation. It throw an error if there is any error like network issue.

```js
const result = await qcApi.queryConfirmation(tx, period);
```

The difference between `queryTransaction` and `queryConfirmation` is `queryTransaction` will return immediately once it retrieve the transaction information. Thus `queryConfirmation` will keep retrying every `period` time until the blockchain finish or fail the confirmation.

#### `DataTypes` property

`DataTypes` provides a set of data type constants for the input and output of the contract calls. e.g. `UINT256`, `STRING`, `ADDRESS`. We can use them like:

```js
const { UINT256, ADDRESS } = qcApi.DataTypes; 
```

#### `Contract` method

`Contract(address)` method takes the address of the contract and returns an object of `Contract` class. Or returns `null` if the address is invalid.

```js
const contract = qcApi.Contract('a27225bcb75142b8f90dcf3365055899b7c091fd');
``` 
More details can be found in `Contract` class.

### `Contract` class

#### `constructor` method
the constructor takes an `address` parameter.

#### `send` method

`send(method, inputData, inputTypes, amount, gasPrice, gasLimit)` is used to send a transaction to the smart contract on the blockchain. It is a write operation and needs some gas to process. 

`method` is the name of the method within the smart contract to call.

`inputData` is the input data e.g. [1, 'abc', true, 'a27225bcb75142b8f90dcf3365055899b7c091fd'].

`inputTypes` is the input types e.g. [UINT256, STRING, BOOL, ADDRESS].

`amount` is the amount to be sent to the contract.

`gasPrice` is the gas price to be used for the transaction.

`gasLimit` is the gas limit to be used for the transaction.

It returns the transaction id in a `Promise` once the blockchain receives the transaction.

```js
try {
  const result = await contract.send(
    'increment', // method
    [3, 1], // inputData
    [UINT256, UINT256], // inputTypes
    0 // amount
  );

  this.setState({output: result});
} catch (e) {
  this.setState({output: e.message});
}    
```

#### `call` method

`call(method, inputData, inputTypes, outputTypes)` is used to call a method within the smart contract on the blockchain. It is a read operation and doesn't need any gas to process.

`method` is the name of the method within the smart contract to call.

`inputData` is the input data e.g. [1, 'abc', true, 'a27225bcb75142b8f90dcf3365055899b7c091fd'].

`inputTypes` is the input types e.g. [UINT256, STRING, BOOL, ADDRESS].

`outputTypes` is the output types e.g. [STRING, UINT256, ADDRESS, BOOL].

It returns the data in an array. e.g. ['abc', 1, 'a27225bcb75142b8f90dcf3365055899b7c091fd', true]. Or if there is only one data, then only return data without array e.g. 'abc'.

```js
try {
  const result = await contract.call(
    'getCount', // method
    null, // inputData
    null, // inputTypes
    [UINT256, UINT256, ADDRESS] // outputTypes
  );
  this.setState({output: JSON.stringify(result)});
} catch (e) {
  this.setState({output: e.message});
}
```

#### `queryTransaction` method

`queryTransaction(tx)` is same as `queryTransaction` method in `QcApi` class.

```js
const result = await contract.queryTransaction(tx);
```

#### `queryConfirmation` method
`queryConfirmation(tx)` is same as `queryConfirmation` method in `QcApi` class.


```js
const result = await contract.queryConfirmation(tx, period);
```

#### `sendAndConfirm` method

`sendAndConfirm(method, inputData, inputTypes, amount, gasPrice, gasLimit, period)` is used to send a transaction to the smart contract on the blockchain and wait for the confirmation. It is a write operation and needs some gas to process. 

`method` is the name of the method within the smart contract to call.

`inputData` is the input data e.g. [1, 'abc', true, 'a27225bcb75142b8f90dcf3365055899b7c091fd'].

`inputTypes` is the input types e.g. [UINT256, STRING, BOOL, ADDRESS].

`amount` is the amount to be sent to the contract.

`gasPrice` is the gas price to be used for the transaction.

`gasLimit` is the gas limit to be used for the transaction.

`period` is the duration to query the confirmation.

```js
try {
  const result = await contract.sendAndConfirm(
    'increment', // method
    [3, 1], // inputData
    [UINT256, UINT256], // inputTypes
    0 // amount
  );
  this.setState({output: JSON.stringify(result)});
} catch (e) {
  this.setState({output: e.message});
}
```

## License

[LGPL-3.0+](LICENSE.md)

