const { Alchemy, Network } = require("alchemy-sdk");
const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

const ONE_VFY_EQUIVALENT_ETH_SEPOLIA = 0.0001; // Hardcoded equivalence to be replaced by API dex (how many ETH sepolia for 1 VFY token)
const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

// Available networks mapping
const AVAILABLE_NETWORKS = {
    'eth-mainnet': Network.ETH_MAINNET,
    'eth-sepolia': Network.ETH_SEPOLIA,
    'opt-mainnet': Network.OPT_MAINNET,
    'opt-sepolia': Network.OPT_SEPOLIA,
    'arb-mainnet': Network.ARB_MAINNET,
    'arb-sepolia': Network.ARB_SEPOLIA,
    'polygon-mainnet': Network.MATIC_MAINNET,
    'polygon-mumbai': Network.MATIC_MUMBAI,
    'astar-mainnet': Network.ASTAR_MAINNET,
    'polygonzkevm-mainnet': Network.POLYGONZKEVM_MAINNET,
    'polygonzkevm-testnet': Network.POLYGONZKEVM_TESTNET,
    'base-mainnet': Network.BASE_MAINNET,
    'base-sepolia': Network.BASE_SEPOLIA
};

// Function to calculate VFY token price
async function calculateCostInVfy(evmGasUnits, chain) {
    try {
        // Configure Alchemy SDK
        const config = {
            apiKey: ALCHEMY_API_KEY,
            network: chain,
        };

        const alchemy = new Alchemy(config);
        const evmGasPrice = await alchemy.core.getGasPrice();
        const totalCostEvmInWei = evmGasUnits * evmGasPrice.toNumber();
        const totalCostVfyInWei = totalCostEvmInWei / ONE_VFY_EQUIVALENT_ETH_SEPOLIA;

        return {
            evmGasPrice: evmGasPrice.toString(),
            totalCostEvmInWei,
            totalCostVfyInWei,
            evmGasUnits
        };
    } catch (error) {
        console.error("Error calculating VFY price:", error);
        throw error;
    }
}

// Main function that can be called from another script
async function main(proofVerificationCost, messageExecutionCost, networkArg) {
    try {
        // Validate inputs
        if (!proofVerificationCost || !messageExecutionCost || !networkArg) {
            throw new Error("Missing required parameters");
        }

        if (isNaN(proofVerificationCost) || isNaN(messageExecutionCost)) {
            throw new Error("First two parameters must be valid numbers");
        }

        networkArg = networkArg.toLowerCase();
        if (!AVAILABLE_NETWORKS[networkArg]) {
            throw new Error(`Invalid network: ${networkArg}`);
        }

        const chain = AVAILABLE_NETWORKS[networkArg];
        const evmGasUnits = proofVerificationCost + messageExecutionCost;

        const result = await calculateCostInVfy(evmGasUnits, chain);

        // Log results for debugging
        console.log("Calculation Results:");
        console.log("-------------------");
        console.log(`Network: ${networkArg}`);
        console.log(`Proof Verification Cost: ${proofVerificationCost} gas units`);
        console.log(`Message Execution Cost: ${messageExecutionCost} gas units`);
        console.log(`Total EVM Gas Units: ${result.evmGasUnits}`);
        console.log(`EVM Gas Price: ${result.evmGasPrice} wei`);
        console.log(`Total Cost in Wei in EVM: ${result.totalCostEvmInWei} wei`);
        console.log(`Equivalent VFY Cost in Wei: ${result.totalCostVfyInWei} VFY`);

        // Return the VFY cost in wei
        return result.totalCostVfyInWei;
    } catch (error) {
        console.error("Error in main:", error);
        throw error;
    }
}

// If script is run directly (not imported as a module)
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length !== 3) {
        console.error("Usage: node calculateVfyGasPrice.js <PROOF_VERIFICATION_COST> <MESSAGE_EXECUTION_COST> <NETWORK>");
        console.error("Example: node calculateVfyGasPrice.js 150000 63385 eth-sepolia");
        console.error("\nAvailable networks:");
        console.error(Object.keys(AVAILABLE_NETWORKS).join('\n'));
        process.exit(1);
    }

    const PROOF_VERIFICATION_COST = parseInt(args[0]);
    const MESSAGE_EXECUTION_COST = parseInt(args[1]);
    const networkArg = args[2];

    main(PROOF_VERIFICATION_COST, MESSAGE_EXECUTION_COST, networkArg)
        .then(result => {
            // When run directly, we still want to return the value
            process.exit(0);
        })
        .catch(error => {
            console.error(error);
            process.exit(1);
        });
}

// Export the main function for use in other scripts
module.exports = main;