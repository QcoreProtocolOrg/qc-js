import abi from 'ethereumjs-abi';
import xhr from 'axios';

const TESTNET_TX_API = 'https://testnet.qtum.org/insight-api/tx/';
const TX_API = TESTNET_TX_API;

const TESTNET_ACCOUNT_API = 'https://testnet.qtum.org/insight-api/addr/address/?noTxList=1';
const ACCOUNT_API = TESTNET_ACCOUNT_API;

const TESTNET_CONTRACT_API = 'https://testnet.qtum.org/insight-api/contracts/address/info';
const CONTRACT_API = TESTNET_CONTRACT_API;

const callbackMap = {};
const outputTypesMap = {};
const sendRequest = (method, data, callback) => {
    const serialNumber = randomCode(32);
    callbackMap[serialNumber] = callback;
    window.postMessage({
        route: { wallet: 'qtum', source: 'SDK', target: 'contentscript' },
        data: {
            serialNumber,
            method,
            data
        }
    }, '*');
};

const randomCode = (len) => {
    let d,
        e,
        b = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        c = '';
    for (d = 0; len > d; d += 1) {
        e = Math.random() * b.length;
        e = Math.floor(e);
        c += b.charAt(e);
    }
    return c;
};

const setupListner = () => {
    window.addEventListener('message', message => {
        const { route, data } = message.data;
        if (!route || route.wallet !== 'qtum'
            || route.source !== 'contentscript'
            || route.target !== 'SDK') {
            return;
        }
        const callback = callbackMap[data.serialNumber];
        callback && callback(data.data);
        delete callbackMap[data.serialNumber];
    });
};

const encodeData = (method, inputData, inputTypes) => {
    const encodedMethodData = abi.methodID(method, inputTypes);
    if(inputData.length>0)
    {
        const encodedInputData = abi.rawEncode(inputTypes, inputData);
        return Buffer.concat([encodedMethodData, encodedInputData]).toString('hex');
    }else{
        return encodedMethodData.toString('hex');
    }
};

const decodedData = (outputTypes, outputStr) => {
    const outputByteArray = toByteArray(outputStr);
    const decodedData = abi.rawDecode(outputTypes, outputByteArray);
    return decodedData;
};

const queryTransaction = async tx => {
    try {
        const { data } = await xhr.get(TX_API + tx);
        return new Promise((resolve, reject) => {
            resolve(data);
        });
    } catch (error) {
        return new Promise((resolve, reject) => {
            reject(error.message)
        });
    }
};

let queryConfirmationInterval;
const queryConfirmation = async (tx, period) => {
    period = period || 5000;
    return new Promise((resolve, reject) => {
        queryConfirmationInterval = setInterval(async () => {
            try {
                const result = await queryTransaction(tx);
                if (result.blockhash) {
                    clearInterval(queryConfirmationInterval);
                    if (result.receipt && result.receipt.length > 0 
                        && result.receipt[0].excepted === 'None') {
                        resolve({
                            tx: result.txid,
                            status: 'Confirmed',
                            confirmations: result.confirmations
                        });
                    } else {
                        if (result.receipt && result.receipt.length > 0 
                            && result.receipt[0].excepted) {
                            reject(result.receipt[0].excepted);
                            return;
                        }
                        reject('Unknown error!');
                    }
                }
            } catch (error) {
                clearInterval(queryConfirmationInterval);
                reject(error.message);
            }
        }, period);
    });
};

const toByteArray= (hexString) =>{
  const result = [];
  while (hexString.length >= 2) {
    result.push(parseInt(hexString.substring(0, 2), 16));
    hexString = hexString.substring(2, hexString.length);
  }
  return result;
};

const isValidAddress = (address) => {
    // TODO: Need more rules
    return !!address;
};

/**
 * Contract class, used to interact with the Qtum's smart contract
 *
 * @class Contract
 * @param {String} address
 */
class Contract {
    constructor(address) {
        this.address = address;
    }

    /**
     * Send transaction to smart contract
     *
     * @method send
     * @param {String} method, the method name of the contract
     * @param {Array} inputData, the input data e.g. `[1, 'abc', true, 'a27225bcb75142b8f90dcf3365055899b7c091fd']`
     * @param {Array} inputTypes, the input types e.g. `[UINT256, STRING, BOOL, ADDRESS]`
     * @param {Number} amount, the amount (Satoshi) to be sent to the contract.
     * @param {Number} gasPrice, gas price (Satoshi)
     * @param {Number} gasLimit, gas limit
     * @returns {Promise} return the transaction id.
     */
    send(method, inputData, inputTypes, amount, gasPrice, gasLimit) {
        inputData = inputData || [];
        inputTypes = inputTypes || [];
        gasPrice = gasPrice || 0.0000004;
        gasLimit = gasLimit || 250000;

        if (!amount || amount < 0) {
            amount = 0;
        }

        const encodedData = encodeData(method, inputData, inputTypes);
        const txData = {
            version: 0,
            nonce: 1,
            gasPrice,
            gasLimit
        };
        const sendData = {
            address: this.address,
            method,
            amount,
            encodedData,
            txData
        };
        return new Promise((resovle, reject) => {
            sendRequest('sendToContract', sendData, (data) => {
                if (data.error) {
                    console.log(data.error);
                    reject(new Error(data.error));
                    return;
                }
                resovle(data.tx.txid);
            });
        });
    }

    /**
     * Call transaction to smart contract
     *
     * @method call
     * @param {String} method, the method name of the contract
     * @param {Array} inputData, the input data e.g. `[1, 'abc', true, 'a27225bcb75142b8f90dcf3365055899b7c091fd']`
     * @param {Array} inputTypes, the input types e.g. `[UINT256, STRING, BOOL, ADDRESS]`
     * @param {Array} outputTypes, the output types e.g. `[STRING, UINT256, ADDRESS, BOOL]`
     * @returns {Promise} return the data in an array. e.g. `['abc', 1, 'a27225bcb75142b8f90dcf3365055899b7c091fd', true]`. Or if there is only one data, then only return data without array e.g. 'abc'.
     */
    call(method, inputData, inputTypes, outputTypes) {
        inputData = inputData || [];
        inputTypes = inputTypes || [];
        outputTypes = outputTypes || [];

        const encodedData = encodeData(method, inputData, inputTypes);
        // Apply defaults
        const txData = {
            version: 0,
            nonce: 1
        };

        const callData = {
            address: this.address,
            method,
            encodedData,
            txData
        };

        const serialNumber = randomCode(32);
        outputTypesMap[serialNumber] = outputTypes;

        return new Promise((resovle, reject) => {
            sendRequest('callContract', callData, (data) => {
                if (data.error) {
                    console.log(data.error);
                    reject(new Error(data.error));
                    delete outputTypesMap[data.serialNumber];
                    return;
                }
                console.log(data);
                var outputResult = decodedData(outputTypesMap[serialNumber], data.executionResult.output);
                delete outputTypesMap[data.serialNumber];
                resovle(outputResult);
            });
        });
    }

    /**
     * Query transaction
     *
     * @method queryTransaction
     * @param {String} tx, the transaction hash
     * @returns {Promise} return the transaction result in JSON.
     */
    async queryTransaction(tx) {
        return await queryTransaction(tx);
    }

    /**
     * Query confirmation
     *
     * @method queryConfirmation
     * @param {String} tx, the transaction hash
     * @param {Number} period, the peroid to fetch
     * @returns {Promise} return the confirmation result in JSON once the transaction is confirmed.
     */
    async queryConfirmation(tx, period) {
        return await queryConfirmation(tx, period);
    }

    /**
     * Send transaction to smart contract and wait for the confirmation
     *
     * @method sendAndConfirm
     * @param {String} method, the method name of the contract
     * @param {Array} inputData, the input data e.g. `[1, 'abc', true, 'a27225bcb75142b8f90dcf3365055899b7c091fd']`
     * @param {Array} inputTypes, the input types e.g. `[UINT256, STRING, BOOL, ADDRESS]`
     * @param {Number} amount, the amount (Satoshi) to be sent to the contract.
     * @param {Number} gasPrice, gas price (Satoshi)
     * @param {Number} gasLimit, gas limit
     * @param {Number} period, the peroid to fetch
     * @returns {Promise} return the confirmation result in JSON once the transaction is confirmed.
     */
    async sendAndConfirm(method, inputData, inputTypes, amount, gasPrice, gasLimit, period) {
        try {
            const tx = await this.send(method, inputData, inputTypes, amount, gasPrice, gasLimit);
            return queryConfirmation(tx, period);
        } catch (error) {
            console.log(error);
            return new Promise((resolve, reject) => {
                reject(error)
            });
        }
    }

}

/**
 * Used to access QC Wallet
 *
 * @class QcApi
 */
class QcApi {
    constructor() {
        setupListner();
    }

    /**
     * Get the installation status of Qtum Light Wallet
     *
     * @method getCurrentAddress
     * @returns {Boolean} return true if the wallet is installed, otherwise, return false.
     */
    isQcWalletInstalled() {
        return new Promise((resolve, reject) => {
            setTimeout(() => {
                resolve(!!window.qcWallet);
            }, 100);
        });
    }

    /**
     * Get current active wallet address
     *
     * @method getCurrentAddress
     * @returns {String} return the active wallet address or null if the wallet is locked.
     */
    getCurrentAddress() {
        return new Promise((resovle, reject) => {
            sendRequest('getCurrentAddress', {}, (data) => {
                resovle(data);
            });
        });
    }

    base58ToHex(str) {
        const callData = {
            address: str
        };
        return new Promise((resovle, reject) => {
            sendRequest('base58ToHex', callData, (data) => {
                resovle(data);
            });
        });
    }

    /**
     * Query account
     *
     * @method queryAccount
     * @param {String} address, the account address
     * @returns {Promise} return the account information in JSON.
     */
    async queryAccount(address) {
        try {
            const url = ACCOUNT_API.replace(/address/g, address);
            const { data } = await xhr.get(url);
            return new Promise((resolve, reject) => {
                resolve(data);
            });
        } catch (error) {
            return new Promise((resolve, reject) => {
                reject(error.message)
            });
        }
    }

    /**
     * Query contract info
     *
     * @method queryContractAccount
     * @param {String} address, the contract account address
     * @returns {Promise} return the contract information in JSON.
     */
    async queryContractInfo(address) {
        try {
            const url = CONTRACT_API.replace(/address/g, address);
            const { data } = await xhr.get(url, { crossdomain: true });
            return new Promise((resolve, reject) => {
                resolve(data);
            });
        } catch (error) {
            return new Promise((resolve, reject) => {
                reject(error.message)
            });
        }
    }

    /**
     * Contract account
     *
     * @method Contract
     * @param {String} address, the smart contract address
     * @returns {Contract} return the Contract instance if the address is valid. Otherwise, return null.
     */
    Contract(address) {
        if(isValidAddress(address)) {
            return new Contract(address);
        }
        return null;
    }

    /**
     * Query transaction
     *
     * @method queryTransaction
     * @param {String} tx, the transaction hash
     * @returns {Promise} return the transaction result in JSON.
     */
    async queryTransaction(tx) {
        return await queryTransaction(tx);
    }

    /**
     * Query confirmation
     *
     * @method queryConfirmation
     * @param {String} tx, the transaction hash
     * @param {Number} period, the peroid to fetch
     * @returns {Promise} return the confirmation result in JSON once the transaction is confirmed.
     */
    async queryConfirmation(tx, period) {
        return await queryConfirmation(tx, period);
    }

    /**
     * Data Types
     *
     * @method DataTypes
     * @returns {Object} return the Data Types object.
     */
    get DataTypes() {
        return {
            ARRAY: '[]',
            BOOL: 'bool',
            ADDRESS: 'address',
            STRING: 'string',
            UINT: 'uint',
            UINT8: 'uint8',
            UINT16: 'uint16',
            UINT32: 'uint32',
            UINT64: 'uint64',
            UINT128: 'uint128',
            UINT256: 'uint256',
            INT: 'int',
            INT8: 'int8',
            INT16: 'int16',
            INT32: 'int32',
            INT64: 'int64',
            INT128: 'int128',
            INT256: 'int256',
            BYTES: 'bytes',
            BYTES1: 'bytes1',
            BYTES2: 'bytes2',
            BYTES3: 'bytes3',
            BYTES4: 'bytes4',
            BYTES5: 'bytes5',
            BYTES6: 'bytes6',
            BYTES7: 'bytes7',
            BYTES8: 'bytes8',
            BYTES9: 'bytes9',
            BYTES10: 'bytes10',
            BYTES11: 'bytes11',
            BYTES12: 'bytes12',
            BYTES13: 'bytes13',
            BYTES14: 'bytes14',
            BYTES15: 'bytes15',
            BYTES16: 'bytes16',
            BYTES17: 'bytes17',
            BYTES18: 'bytes18',
            BYTES19: 'bytes19',
            BYTES20: 'bytes20',
            BYTES21: 'bytes21',
            BYTES22: 'bytes22',
            BYTES23: 'bytes23',
            BYTES24: 'bytes24',
            BYTES25: 'bytes25',
            BYTES26: 'bytes26',
            BYTES27: 'bytes27',
            BYTES28: 'bytes28',
            BYTES29: 'bytes29',
            BYTES30: 'bytes30',
            BYTES31: 'bytes31',
            BYTES32: 'bytes32',
            STRING_ARRAY: 'string[]',
            ADDRESS_ARRAY: 'address[]'
        };
    };
}

export { QcApi };
