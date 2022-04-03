# Astro's Auction House

Astros Auction House is an EVM-compatible Auction House made for users to buy and sell items on the blockchain.

* Users can create an auction for selling something (right now just physical auctions, NFTs with ERC721 coming).

* Other users can bid on these auctions.

* When the auction has ended, payout winners or refund customers.

* Customers funds held in Escrow contract and available to withdraw after an auction has ended. It uses a pull model for this.

**ERC721 implementation for NFTs in upcoming release**
**Proxy upgrade  in upcoming release**

Please check the github for any issues and current progress of development


## Prerequisites

* Truffle v5.0+
* npm
* Ganache 
* solc ^0.8.1

## To install

1. Clone the code
2. Restore packages
   `npm install` from the current directory
3. `truffle test` to run all tests
4. `truffle console` to connect to Ganache RPC. Make sure Ganache is open.
5. Interact with deployed contracts

Ropsten contract: https://ropsten.etherscan.io/address/0x8d4c63eafceeb2b03c394fae9809bcee026dce03

Kovan contract: https://kovan.etherscan.io/address/0x8d4c63eafceeb2b03c394fae9809bcee026dce03

Rinkeby contract: https://rinkeby.etherscan.io/address/0x8d4c63eafceeb2b03c394fae9809bcee026dce03
