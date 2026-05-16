# Astro's Auction House

An EVM-compatible Auction House I built for fun to learn how smart contracts handle money. Users can create auctions, bid on them, and the contract manages the whole lifecycle — escrow, refunds, payouts.

Built before AI was a thing, recently refactored to fix some real issues I found when revisiting the code.

## What it does

* **Create auctions** — set a start price, reserve price, end time, and let bidders come to you
* **Place bids** — must be at least 5% higher than the current bid (prevents sniping with trivial increases)
* **Automatic refunds** — outbid? Your funds go straight to escrow, withdrawable immediately
* **Reserve price** — if nobody meets it, all bids are refunded. No sale forced below your floor
* **Pull-based withdrawals** — nobody's funds get stuck because of a bad recipient address
* **Pausable** — owner can freeze new activity in emergencies, but withdrawals always work

## Architecture

Everything lives in one contract. The original version deployed a new child contract per auction (factory pattern), which was expensive and unnecessary. This version stores all auctions in a mapping:

```
mapping(uint256 => Auction) private auctions;
mapping(address => uint256) private deposits;  // global escrow
```

Only one bid is tracked at a time (the current highest). Previous bidders get refunded immediately into escrow. This means:
- No loops at finalization (O(1) gas regardless of bid count)
- No DOS risk from too many bids
- No array management or deletion holes

## Gas Costs

Measured on local Ganache. Actual mainnet costs depend on network congestion.

| Operation | Gas Used | Est. Cost @ 30 gwei | Est. Cost @ 10 gwei |
|-----------|----------|---------------------|---------------------|
| Deploy contract | ~2,937,000 | ~$5.50 | ~$1.80 |
| Create auction | ~139,000 | ~$0.26 | ~$0.09 |
| First bid | ~94,000 | ~$0.18 | ~$0.06 |
| Subsequent bid (with refund) | ~95,000 | ~$0.18 | ~$0.06 |
| End auction (reserve met) | ~62,000 | ~$0.12 | ~$0.04 |
| End auction (reserve not met) | ~61,000 | ~$0.11 | ~$0.04 |
| End auction (no bids) | ~33,000 | ~$0.06 | ~$0.02 |
| Withdraw funds | ~25,000 | ~$0.05 | ~$0.02 |

*USD estimates assume ETH @ $3,000. Adjust for current prices.*

**Compared to the old factory pattern:** creating an auction used to cost ~500k+ gas (deploying a child contract). Now it's ~139k — roughly 3.5x cheaper.

**Why "subsequent bid" is barely more than first bid:** the refund to the previous bidder is just a storage write (`deposits[prev] += amount`), not an ETH transfer. Cheap.

**Finalization is constant-time:** whether the auction had 2 bids or 200, `endAuction` costs the same gas. All intermediate refunds happened during bidding.

## How funds flow

```
Bidder sends ETH  -->  Contract holds it (msg.value)
                        |
                        |-- Outbid? -> deposits[bidder] += amount (withdrawable)
                        |
                        '-- Auction ends:
                              |-- Reserve met   -> deposits[seller] += winningBid
                              '-- Reserve unmet -> deposits[bidder] += amount
                                                    |
                                                    v
                              withdrawPayments() -> ETH sent to address
```

Active bids are **not** stored in the escrow mapping. Only refunds and final payouts are. This prevents double-counting.

## Security

* **ReentrancyGuard** on withdrawals — prevents reentrancy attacks
* **Checks-effects-interactions** pattern — balance zeroed before ETH transfer
* **Pull pattern** — recipients claim funds themselves, avoiding failed-send lockups
* **Pausable** — owner can halt new activity but never lock user funds
* **No unbounded loops** — finalization is O(1), eliminating DOS via block gas limit
* **5% minimum increment** — prevents griefing with dust bids

## What it doesn't do (yet)

* **No NFT support** — just value auctions for now. ERC721 integration would be straightforward
* **No dispute resolution** — if the item doesn't arrive, the contract doesn't care. Would need off-chain arbitration
* **No automatic ending** — owner must call `endAuction`. Could add a `finalizeExpired` anyone can call after endTime
* **No proxy upgrades** — once deployed, it's frozen. This is a deliberate tradeoff (simpler, fewer attack vectors)

## Prerequisites

* Truffle v5.0+
* npm
* Ganache
* solc ^0.8.1

## To install

1. Clone the repo
2. Install packages: `npm install`
3. Start Ganache on port 7545 with network ID 5777
4. Run tests: `npx truffle test`
5. Deploy: `npx truffle migrate`

## Tests

27 tests covering:
- Auction creation and validation
- Bidding mechanics (increment enforcement, self-bid prevention, expiration)
- Reserve price logic (met vs unmet)
- Escrow and withdrawal (pull pattern, double-withdraw prevention)
- Pause/unpause (blocks new activity, doesn't lock funds)
- Multi-auction participation (refunds accumulate correctly)
- Same-bidder re-entry (bid, get outbid, withdraw, bid again)

## Previous testnet deployments (old version)

These were the factory-pattern version. They still work but are the old architecture:

- Ropsten: https://ropsten.etherscan.io/address/0x8d4c63eafceeb2b03c394fae9809bcee026dce03
- Kovan: https://kovan.etherscan.io/address/0x8d4c63eafceeb2b03c394fae9809bcee026dce03
- Rinkeby: https://rinkeby.etherscan.io/address/0x8d4c63eafceeb2b03c394fae9809bcee026dce03
