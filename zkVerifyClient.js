const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { cryptoWaitReady } = require('@polkadot/util-crypto');
const relayerFeeVfyCostConverter = require('./relayerFeeVfyCostConverter');

/**
 * Module for interacting with the blockchain chain client and run extrinsics
 */
class ZkVerifyClient {
    constructor() {
        this.api = null;
        this.keyring = null;
        this.isConnected = false;
    }

    /**
     * Connect to the chain
     * @param {string} wsEndpoint - WebSocket endpoint of the node
     * @returns {Promise<void>}
     */
    async connect(wsEndpoint) {
        try {
            // Wait for the crypto to be ready
            await cryptoWaitReady();

            // Create a keyring instance with ss58Format 251 for zkVerify
            this.keyring = new Keyring({ type: 'sr25519', ss58Format: 251 });

            // Connect to the node
            const provider = new WsProvider(wsEndpoint);
            this.api = await ApiPromise.create({ provider });

            this.isConnected = true;
            console.log(`Connected to node at ${wsEndpoint}`);
        } catch (error) {
            console.error('Error connecting to node:', error);
            throw error;
        }
    }

    /**
     * Disconnect from the chain
     * @returns {Promise<void>}
     */
    async disconnect() {
        if (this.api) {
            await this.api.disconnect();
            this.isConnected = false;
            console.log('Disconnected from node');
        }
    }

    /**
     * Add an account to the keyring
     * @param {string} mnemonic - The mnemonic phrase for the account
     * @param {string} name - Optional name for the account
     * @returns {Object} - The added account
     */
    addAccount(mnemonic, name = 'default') {
        if (!this.keyring) {
            throw new Error('Not connected to node. Call connect() first.');
        }

        const account = this.keyring.addFromMnemonic(mnemonic, { name });
        console.log(`Added account ${account.address} with name ${name}`);
        return account;
    }

    /**
     * Calculate the total delivery price in VFY tokens
     * @param {number} proofVerificationCost - Gas units for proof verification
     * @param {number} messageExecutionCost - Gas units for message execution
     * @param {string} network - The network identifier (e.g., 'eth-mainnet')
     * @param {number} relayerFeeTip - Relayer fee tip in VFY tokens
     * @param {number} protocolFee - Protocol fee in VFY tokens
     * @param {number} deliveryOwnerFee - Delivery owner fee in VFY tokens
     * @param {number} feePercentage - Optional fee percentage for gas calculation
     * @returns {Promise<{evmCost: {gasUnits: number, gasPrice: string, costInWei: number}, vfyCost: number, totalPrice: number}>} - The calculation result
     */
    async calculateDeliveryPrice(
        proofVerificationCost,
        messageExecutionCost,
        network,
        relayerFeeTip,
        protocolFee,
        deliveryOwnerFee,
        feePercentage = 0
    ) {
        try {
            // Calculate the base cost in VFY using the existing module
            const baseResult = await relayerFeeVfyCostConverter.calculateTotalCost(
                proofVerificationCost,
                messageExecutionCost,
                network,
                feePercentage
            );

            // Calculate the total price in VFY
            const totalPrice = baseResult.vfyCost + relayerFeeTip + protocolFee + deliveryOwnerFee;

            return {
                ...baseResult,
                totalPrice
            };
        } catch (error) {
            console.error('Error calculating delivery price:', error);
            throw error;
        }
    }

    /**
     * Set the delivery price on the chain
     * @param {Object} account - The account to sign the transaction
     * @param {number} domainId - The domain ID
     * @param {number} proofVerificationCost - Gas units for proof verification
     * @param {number} messageExecutionCost - Gas units for message execution
     * @param {string} network - The network identifier (e.g., 'eth-mainnet')
     * @param {number} relayerFeeTip - Relayer fee tip in VFY tokens
     * @param {number} protocolFee - Protocol fee in VFY tokens
     * @param {number} deliveryOwnerFee - Delivery owner fee in VFY tokens
     * @param {number} feePercentage - Optional fee percentage for gas calculation
     * @returns {Promise<{success: boolean, txHash: string, price: number}>} - The transaction result
     */
    async setDeliveryPrice(
        account,
        domainId,
        proofVerificationCost,
        messageExecutionCost,
        network,
        relayerFeeTip,
        protocolFee,
        deliveryOwnerFee,
        feePercentage = 0
    ) {
        try {
            if (!this.isConnected || !this.api) {
                throw new Error('Not connected to node. Call connect() first.');
            }

            // Calculate the total price
            const { totalPrice } = await this.calculateDeliveryPrice(
                proofVerificationCost,
                messageExecutionCost,
                network,
                relayerFeeTip,
                protocolFee,
                deliveryOwnerFee,
                feePercentage
            );

            const chainPrice = BigInt(Math.floor(totalPrice * 10**18));

            console.log(`Setting delivery price: ${totalPrice} VFY (${chainPrice} smallest units)`);

            // Create and sign the transaction
            const tx = this.api.tx.aggregate.setDeliveryPrice(domainId, chainPrice);

            // Send the transaction and handle the result properly
            return new Promise((resolve, reject) => {
                tx.signAndSend(account, { nonce: -1 }, ({ status, events, txHash }) => {
                    if (status.isInBlock || status.isFinalized) {
                        // Check if the transaction was successful
                        const success = events.find(
                            ({ event }) => event.section === 'system' && event.method === 'ExtrinsicSuccess'
                        );

                        if (success) {
                            resolve({
                                success: true,
                                txHash: txHash.toString(),
                                price: totalPrice
                            });
                        } else {
                            const error = events.find(
                                ({ event }) => event.section === 'system' && event.method === 'ExtrinsicFailed'
                            );

                            reject(new Error(`Transaction failed: ${error ? error.event.data.toString() : 'Unknown error'}`));
                        }
                    }
                }).catch(error => {
                    reject(new Error(`Transaction error: ${error.message}`));
                });
            });
        } catch (error) {
            console.error('Error setting delivery price:', error);
            throw error;
        }
    }
}

// Export the class
module.exports = new ZkVerifyClient();