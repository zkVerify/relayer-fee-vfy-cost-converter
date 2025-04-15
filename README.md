# Set delivery price and gas cost calculation from EVM tokens to VFY

A library for calculating the cost of gas in VFY tokens for relayer fees in EVM chains, and also setting the delivery price for a given domain.

## Features

- Calculate the cost of gas in VFY tokens for relayer fee in EVMs
- Support for multiple EVM networks (Ethereum, Polygon, BNB Chain, etc.)
- Configurable fee percentage for additional costs
- Set delivery prices for a given domain. 


## Usage

### Basic Gas Price Calculation

```javascript
const { calculateRelayerFeeInVfy } = require('./main');

// Example values
const PROOF_VERIFICATION_COST = 150000; // gas units
const MESSAGE_EXECUTION_COST = 63385;   // gas units
const network = 'eth-sepolia';          // network identifier
const feePercentage = 0;                // optional fee percentage

// Calculate the cost in VFY tokens
calculateRelayerFeeInVfy(PROOF_VERIFICATION_COST, MESSAGE_EXECUTION_COST, network, feePercentage)
  .then(vfyCost => {
    console.log(`Cost in VFY tokens: ${vfycost} VFY`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

### Setting Delivery Price

```javascript
const { setDeliveryPrice } = require('./main');

// Example values
const mnemonic = 'your mnemonic phrase';
const domainId = 1;
const proofVerificationCost = 150000; // gas units
const messageExecutionCost = 63385;   // gas units
const network = 'eth-sepolia';        // network identifier
const relayerFeeTip = 0.1;            // VFY tokens (e.g., 0.1 VFY)
const protocolFee = 0.05;             // VFY tokens (e.g., 0.05 VFY)
const deliveryOwnerFee = 0.02;        // VFY tokens (e.g., 0.02 VFY)
const feePercentage = 0;              // optional fee percentage

// Set the delivery price
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
  .then(result => {
    console.log(`Transaction successful: ${result.success}`);
    console.log(`Transaction hash: ${result.txHash}`);
    console.log(`Price set: ${result.price} VFY`);
  })
  .catch(error => {
    console.error('Error:', error);
  });
```

## Command Line Usage

### Gas Price Calculation

```bash
node main.js <PROOF_VERIFICATION_COST> <MESSAGE_EXECUTION_COST> <NETWORK> [FEE_PERCENTAGE]
```

Example:
```bash
node main.js 150000 63385 eth-sepolia 0
```

### Setting Delivery Price

```bash
node main.js --delivery-price <MNEMONIC> <DOMAIN_ID> <PROOF_VERIFICATION_COST> <MESSAGE_EXECUTION_COST> <NETWORK> <RELAYER_FEE_TIP> <PROTOCOL_FEE> <DELIVERY_OWNER_FEE> [FEE_PERCENTAGE]
```

Example:
```bash
node main.js --delivery-price 'your mnemonic phrase' 1 150000 63385 eth-sepolia 0.1 0.05 0.02 0
```

> **Note:** The fee parameters (relayerFeeTip, protocolFee, deliveryOwnerFee) should be specified in VFY tokens. For example, 0.1 means 0.1 VFY tokens. The library will automatically convert these values to the smallest unit (10^18 units per VFY) when sending to the chain.

## API Reference

### calculateRelayerFeeInVfy(proofVerificationCost, messageExecutionCost, network, feePercentage)

Calculates the cost in VFY tokens for EVM transactions.

- `proofVerificationCost` (number): Gas units for proof verification
- `messageExecutionCost` (number): Gas units for message execution
- `network` (string): The network identifier (e.g., 'eth-mainnet')
- `feePercentage` (number, optional): Fee percentage (defaults to 0)
- Returns: Promise<number> - The cost in VFY tokens

### setDeliveryPrice(mnemonic, domainId, proofVerificationCost, messageExecutionCost, network, relayerFeeTip, protocolFee, deliveryOwnerFee, feePercentage)

Sets the delivery price.

- `mnemonic` (string): The mnemonic phrase for the domain owner
- `domainId` (number): The domain ID
- `proofVerificationCost` (number): Gas units for proof verification
- `messageExecutionCost` (number): Gas units for message execution
- `network` (string): The EVM network identifier (e.g., 'eth-mainnet')
- `relayerFeeTip` (number): Relayer fee tip in VFY tokens (e.g., 0.1 for 0.1 VFY)
- `protocolFee` (number): Protocol fee in VFY tokens (e.g., 0.05 for 0.05 VFY)
- `deliveryOwnerFee` (number): Delivery owner fee tip in VFY tokens (e.g., 0.02 for 0.02 VFY)
- `feePercentage` (number, optional): Fee percentage for gas calculation (defaults to 0)
- Returns: Promise<{success: boolean, txHash: string, price: number}> - The transaction result