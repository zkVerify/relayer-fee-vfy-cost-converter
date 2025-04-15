const relayerFeeVfyCostConverter = require('./relayerFeeVfyCostConverter');
const zkVerifyClient = require('./zkVerifyClient');

// Default fee percentage (can be overridden)
const DEFAULT_FEE_PERCENTAGE = 0;

// Hardcoded WebSocket endpoint
const WS_ENDPOINT = 'wss://volta-rpc.zkverify.io';

/**
 * Main function that calculates the cost in VFY tokens
 * @param {number} proofVerificationCost - Gas units for proof verification
 * @param {number} messageExecutionCost - Gas units for message execution
 * @param {string} network - The network identifier (e.g., 'eth-mainnet')
 * @param {number} feePercentage - Optional fee percentage (defaults to DEFAULT_FEE_PERCENTAGE)
 * @returns {Promise<number>} - The cost in VFY tokens
 */
async function calculateRelayerFeeInVfy(proofVerificationCost, messageExecutionCost, network, feePercentage = DEFAULT_FEE_PERCENTAGE) {
    try {
        // Use the library to calculate the total cost
        const result = await relayerFeeVfyCostConverter.calculateTotalCost(
            proofVerificationCost,
            messageExecutionCost,
            network,
            feePercentage
        );

        // Log results for debugging
        console.log("Calculation Results:");
        console.log("-------------------");
        console.log(`Network: ${network}`);
        console.log(`Proof Verification Cost: ${proofVerificationCost} gas units`);
        console.log(`Message Execution Cost: ${messageExecutionCost} gas units`);
        console.log(`Total EVM Gas Units: ${result.evmCost.gasUnits}`);
        console.log(`EVM Gas Price: ${result.evmCost.gasPrice} wei`);
        console.log(`Total Cost in Wei: ${result.evmCost.costInWei} wei`);
        console.log(`Conversion Rate: 1 VFY = ${relayerFeeVfyCostConverter.AVAILABLE_NETWORKS[network.toLowerCase()].weiPerVfy} wei`);
        console.log(`Fee Percentage: ${feePercentage}%`);
        console.log(`Equivalent VFY Token Price: ${result.vfyCost} VFY`);

        // Return the VFY cost
        return result.vfyCost;
    } catch (error) {
        console.error("Error calculating VFY gas price:", error);
        throw error;
    }
}

/**
 * Example function showing how to use the delivery price module
 * @param {string} mnemonic - The mnemonic phrase for the account
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
async function setDeliveryPrice(
    mnemonic,
    domainId,
    proofVerificationCost,
    messageExecutionCost,
    network,
    relayerFeeTip,
    protocolFee,
    deliveryOwnerFee,
    feePercentage = DEFAULT_FEE_PERCENTAGE
) {
    try {
        // Connect to the node
        await zkVerifyClient.connect(WS_ENDPOINT);

        // Add the account
        const account = zkVerifyClient.addAccount(mnemonic, 'delivery-price-setter');

        // Calculate the price first
        const priceResult = await zkVerifyClient.calculateDeliveryPrice(
            proofVerificationCost,
            messageExecutionCost,
            network,
            relayerFeeTip,
            protocolFee,
            deliveryOwnerFee,
            feePercentage
        );

        console.log("Delivery Price Calculation:");
        console.log("---------------------------");
        console.log(`Base VFY Cost: ${priceResult.vfyCost} VFY`);
        console.log(`Relayer Fee Tip: ${relayerFeeTip} VFY`);
        console.log(`Protocol Fee: ${protocolFee} VFY`);
        console.log(`Delivery Owner Fee: ${deliveryOwnerFee} VFY`);
        console.log(`Total Price: ${priceResult.totalPrice} VFY`);

        // Set the delivery price on the chain
        const result = await zkVerifyClient.setDeliveryPrice(
            account,
            domainId,
            proofVerificationCost,
            messageExecutionCost,
            network,
            relayerFeeTip,
            protocolFee,
            deliveryOwnerFee,
            feePercentage
        );

        console.log("Transaction Result:");
        console.log("------------------");
        console.log(`Success: ${result.success}`);
        console.log(`Transaction Hash: ${result.txHash}`);
        console.log(`Price Set: ${result.price} VFY`);

        // Disconnect from the node
        await zkVerifyClient.disconnect();

        return result;
    } catch (error) {
        console.error('Error in setDeliveryPriceExample:', error);
        // Make sure to disconnect even if there's an error
        if (zkVerifyClient.isConnected) {
            await zkVerifyClient.disconnect();
        }
        throw error;
    }
}

// If script is run directly (not imported as a module)
if (require.main === module) {
    const args = process.argv.slice(2);

    // Check if we're running the gas price calculation or the delivery price example
    if (args[0] === '--delivery-price') {
        // Delivery price example
        if (args.length < 9 || args.length > 10) {
            console.error("Usage: node main.js --delivery-price <MNEMONIC> <DOMAIN_ID> <PROOF_VERIFICATION_COST> <MESSAGE_EXECUTION_COST> <NETWORK> <RELAYER_FEE_TIP> <PROTOCOL_FEE> <DELIVERY_OWNER_FEE> [FEE_PERCENTAGE]");
            console.error("Example: node main.js --delivery-price 'your mnemonic phrase' 1 150000 63385 eth-sepolia 0.1 0.05 0.02 0");
            process.exit(1);
        }

        const mnemonic = args[1];
        const domainId = parseInt(args[2]);
        const proofVerificationCost = parseInt(args[3]);
        const messageExecutionCost = parseInt(args[4]);
        const network = args[5];
        const relayerFeeTip = parseFloat(args[6]);
        const protocolFee = parseFloat(args[7]);
        const deliveryOwnerFee = parseFloat(args[8]);
        const feePercentage = args[9] ? parseFloat(args[9]) : DEFAULT_FEE_PERCENTAGE;

        setDeliveryPrice(
            mnemonic,
            domainId,
            proofVerificationCost,
            messageExecutionCost,
            network,
            relayerFeeTip,
            protocolFee,
            deliveryOwnerFee,
            feePercentage
        )
            .then(() => {
                process.exit(0);
            })
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    } else {
        // Gas price calculation
        if (args.length < 3 || args.length > 4) {
            console.error("Usage: node main.js <PROOF_VERIFICATION_COST> <MESSAGE_EXECUTION_COST> <NETWORK> [FEE_PERCENTAGE]");
            console.error("Example: node main.js 150000 63385 eth-sepolia 0");
            console.error("\nAvailable networks:");
            console.error(Object.keys(relayerFeeVfyCostConverter.AVAILABLE_NETWORKS).join('\n'));
            process.exit(1);
        }

        const PROOF_VERIFICATION_COST = parseInt(args[0]);
        const MESSAGE_EXECUTION_COST = parseInt(args[1]);
        const networkArg = args[2];
        const feePercentage = args[3] ? parseFloat(args[3]) : DEFAULT_FEE_PERCENTAGE;

        calculateRelayerFeeInVfy(PROOF_VERIFICATION_COST, MESSAGE_EXECUTION_COST, networkArg, feePercentage)
            .then(result => {
                // When run directly, we still want to return the value
                process.exit(0);
            })
            .catch(error => {
                console.error(error);
                process.exit(1);
            });
    }
}

// Export the functions for use in other scripts
module.exports = {
    calculateRelayerFeeInVfy,
    setDeliveryPrice
};