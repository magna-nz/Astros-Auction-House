# Auction House v2

Users can create an auction for selling something (right now just physical auctions).

Other users can bid on these auctions.

The auction can end and if reserve is met the winning bidder pays out to the auction owner.

Customers funds held in Escrow contract and available to withdraw based on whether they win the auction or reserve is met.

**ERC721 implementation for NFTs in upcoming release**

Please check the github for any issues and current progress of development


## Prerequisites

Prerequisites:
* Truffle v5.0
* npm
* Ganache ^7.0
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
