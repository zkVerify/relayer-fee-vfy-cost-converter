const { Alchemy, Network } = require("alchemy-sdk");
const { ethers } = require("ethers");
const dotenv = require("dotenv");

dotenv.config();

// Available networks mapping with their conversion factors
// The weiPerVfy represents how many wei (smallest unit of the EVM chain's native currency) equals 1 VFY token
const AVAILABLE_NETWORKS = {
    'eth-mainnet': {
        network: Network.ETH_MAINNET,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'eth-sepolia': {
        network: Network.ETH_SEPOLIA,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'opt-mainnet': {
        network: Network.OPT_MAINNET,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'opt-sepolia': {
        network: Network.OPT_SEPOLIA,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'arb-mainnet': {
        network: Network.ARB_MAINNET,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'arb-sepolia': {
        network: Network.ARB_SEPOLIA,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'polygon-mainnet': {
        network: Network.MATIC_MAINNET,
        weiPerVfy: 1e18 // 1 MATIC = 1e18 wei, assuming 1 VFY = 1 MATIC
    },
    'polygon-mumbai': {
        network: Network.MATIC_MUMBAI,
        weiPerVfy: 1e18 // 1 MATIC = 1e18 wei, assuming 1 VFY = 1 MATIC
    },
    'astar-mainnet': {
        network: Network.ASTAR_MAINNET,
        weiPerVfy: 1e18 // 1 ASTR = 1e18 wei, assuming 1 VFY = 1 ASTR
    },
    'polygonzkevm-mainnet': {
        network: Network.POLYGONZKEVM_MAINNET,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'polygonzkevm-testnet': {
        network: Network.POLYGONZKEVM_TESTNET,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'base-mainnet': {
        network: Network.BASE_MAINNET,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    },
    'base-sepolia': {
        network: Network.BASE_SEPOLIA,
        weiPerVfy: 1e18 // 1 ETH = 1e18 wei, assuming 1 VFY = 1 ETH
    }
};

/**
 * Get the current gas price for a specific EVM network
 * @param {string} network - The network identifier (e.g., 'eth-mainnet')
 * @returns {Promise<{gasPrice: string, gasPriceInWei: number}>} - The gas price in both string and number format
 */
async function getEvmGasPrice(network) {
    try {
        // Validate network
        const networkArg = network.toLowerCase();
        if (!AVAILABLE_NETWORKS[networkArg]) {
            throw new Error(`Invalid network: ${networkArg}`);
        }

        const chainConfig = AVAILABLE_NETWORKS[networkArg];

        // Configure Alchemy SDK
        const config = {
            apiKey: process.env.ALCHEMY_API_KEY,
            network: chainConfig.network,
        };

        const alchemy = new Alchemy(config);
        const gasPrice = await alchemy.core.getGasPrice();

        return {
            gasPrice: gasPrice.toString(),
            gasPriceInWei: gasPrice.toNumber()
        };
    } catch (error) {
        console.error("Error getting EVM gas price:", error);
        throw error;
    }
}

/**
 * Calculate the cost of gas units in wei for a specific EVM network
 * @param {number} gasUnits - The number of gas units
 * @param {string} network - The network identifier (e.g., 'eth-mainnet')
 * @returns {Promise<{gasUnits: number, gasPrice: string, costInWei: number}>} - The cost calculation result
 */
async function calculateEvmCostInWei(gasUnits, network) {
    try {
        // Validate inputs
        if (gasUnits === undefined || !network) {
            throw new Error("Missing required parameters");
        }

        if (isNaN(gasUnits)) {
            throw new Error("Gas units must be a valid number");
        }

        // Get current gas price
        const { gasPrice, gasPriceInWei } = await getEvmGasPrice(network);

        // Calculate total cost in wei
        const costInWei = gasUnits * gasPriceInWei;

        return {
            gasUnits,
            gasPrice,
            costInWei
        };
    } catch (error) {
        console.error("Error calculating EVM cost:", error);
        throw error;
    }
}

/**
 * Convert EVM cost in wei to VFY tokens using chain-specific conversion factor
 * @param {number} costInWei - The cost in wei
 * @param {string} network - The network identifier (e.g., 'eth-mainnet')
 * @param {number} feePercentage - Optional fee percentage (0-100)
 * @returns {number} - The cost in VFY tokens
 */
function convertEvmCostToVfy(costInWei, network, feePercentage = 0) {
    try {
        // Validate inputs
        if (costInWei === undefined || !network) {
            throw new Error("Missing required parameters");
        }

        if (isNaN(costInWei)) {
            throw new Error("Cost must be a valid number");
        }

        if (feePercentage < 0 || feePercentage > 100) {
            throw new Error("Fee percentage must be between 0 and 100");
        }

        // Get network configuration
        const networkArg = network.toLowerCase();
        if (!AVAILABLE_NETWORKS[networkArg]) {
            throw new Error(`Invalid network: ${networkArg}`);
        }

        const chainConfig = AVAILABLE_NETWORKS[networkArg];

        // Calculate base cost in VFY using chain-specific conversion factor
        const baseCostInVfy = costInWei / chainConfig.weiPerVfy;

        // Apply fee if specified
        const fee = (baseCostInVfy * feePercentage) / 100;
        const totalCostInVfy = baseCostInVfy + fee;

        return totalCostInVfy;
    } catch (error) {
        console.error("Error converting EVM cost to VFY:", error);
        throw error;
    }
}

/**
 * Calculate the total cost in VFY tokens
 * @param {number} proofVerificationCost - Gas units for proof verification
 * @param {number} messageExecutionCost - Gas units for message execution
 * @param {string} network - The network identifier (e.g., 'eth-mainnet')
 * @param {number} feePercentage - Optional fee percentage (0-100)
 * @returns {Promise<{evmCost: {gasUnits: number, gasPrice: string, costInWei: number}, vfyCost: number}>} - The calculation result
 */
async function calculateTotalCost(proofVerificationCost, messageExecutionCost, network, feePercentage = 0) {
    try {
        // Validate inputs
        if (proofVerificationCost === undefined || messageExecutionCost === undefined || !network) {
            throw new Error("Missing required parameters");
        }

        if (isNaN(proofVerificationCost) || isNaN(messageExecutionCost)) {
            throw new Error("Parameters must be valid numbers");
        }

        // Calculate total gas units
        const totalGasUnits = proofVerificationCost + messageExecutionCost;

        // Calculate EVM cost
        const evmCost = await calculateEvmCostInWei(totalGasUnits, network);

        // Convert to VFY using chain-specific conversion factor
        const vfyCost = convertEvmCostToVfy(evmCost.costInWei, network, feePercentage);

        return {
            evmCost,
            vfyCost
        };
    } catch (error) {
        console.error("Error calculating total cost:", error);
        throw error;
    }
}

// Export the library functions
module.exports = {
    AVAILABLE_NETWORKS,
    getEvmGasPrice,
    calculateEvmCostInWei,
    convertEvmCostToVfy,
    calculateTotalCost
};