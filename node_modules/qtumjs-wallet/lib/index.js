"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./Wallet"));
__export(require("./Insight"));
__export(require("./Network"));
__export(require("./WalletRPCProvider"));
const bip39 = __importStar(require("bip39"));
const wif_1 = require("wif");
const secp256k1_1 = require("secp256k1");
var scrypt_1 = require("./scrypt");
exports.scrypt = scrypt_1.scrypt;
function generateMnemonic() {
    return bip39.generateMnemonic();
}
exports.generateMnemonic = generateMnemonic;
function validatePrivateKey(wif) {
    try {
        const decoded = wif_1.decode(wif);
        return secp256k1_1.privateKeyVerify(decoded.privateKey);
    }
    catch (e) {
        return false;
    }
}
exports.validatePrivateKey = validatePrivateKey;
//# sourceMappingURL=index.js.map