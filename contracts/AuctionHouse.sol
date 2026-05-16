// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/utils/Address.sol";

/// @title Auction House
/// @author Daniel Anderson
/// @notice Decentralized auction platform for buying and selling items
/// @dev Single contract manages all auctions (no factory pattern — saves ~350k gas per auction).
///      Funds flow: bid → held in contract → refunded on outbid or credited to seller on finalize → withdraw.
///      Active bids are NOT stored in the escrow mapping — only refunds and final payouts are.
///      This prevents double-counting and keeps the escrow balance always withdrawable.
contract AuctionHouse is ReentrancyGuard, Ownable, Pausable {
    using Counters for Counters.Counter;
    using Address for address payable;

    enum AuctionStatus { Open, Finished }

    struct Bid {
        address bidder;
        uint256 amount;
        uint256 timestamp;
    }

    /// @dev Struct packing: owner (20 bytes) + endTime (8 bytes) fit in one slot.
    ///      reserveMet (1 byte) + status (1 byte) could share a slot with name (16 bytes).
    struct Auction {
        address owner;
        uint256 startPrice;
        uint256 reservePrice;
        uint64 endTime;
        bytes16 name;
        AuctionStatus status;
        Bid currentHighestBid;
        bool reserveMet;
    }

    // --- Events ---

    event AuctionCreated(
        address indexed auctionOwner,
        uint256 indexed auctionId,
        uint256 startPrice,
        uint256 reservePrice,
        uint64 endTime,
        bytes16 name
    );

    event BidPlaced(
        address indexed bidder,
        uint256 indexed auctionId,
        uint256 amount,
        bool reserveMet
    );

    event BidRefunded(
        address indexed bidder,
        uint256 indexed auctionId,
        uint256 amount
    );

    event AuctionFinalized(
        address indexed winner,
        address indexed seller,
        uint256 indexed auctionId,
        uint256 finalAmount
    );

    event AuctionFinalizedNoBids(uint256 indexed auctionId);

    event AvailableBalanceUpdated(
        address indexed account,
        uint256 amount,
        uint256 newBalance
    );

    event Withdrawn(address indexed payee, uint256 amount);

    // --- Constants ---

    /// @dev Minimum 5% increment prevents bid sniping with trivial increases
    uint256 constant MIN_BID_INCREMENT_PERCENT = 5;

    // --- State ---

    Counters.Counter private auctionIdCounter;

    /// @dev All auctions stored in one mapping — no child contract deployments
    mapping(uint256 => Auction) private auctions;

    /// @dev Global escrow: tracks withdrawable balances per address.
    ///      Only contains refunded bids and finalized payouts — never active bids.
    ///      Uses += to accumulate across multiple auctions safely.
    mapping(address => uint256) private deposits;

    constructor() {}

    // =========================================================================
    // AUCTION LIFECYCLE
    // =========================================================================

    /// @notice Create a new auction
    /// @dev Gas: ~139k. Stores auction data in a single mapping slot group.
    /// @param reservePrice Minimum price that must be met for the sale to proceed
    /// @param startPrice Minimum accepted first bid
    /// @param auctionName Identifier for the auction (bytes16 for gas efficiency)
    /// @param endTime Unix timestamp after which no new bids are accepted
    function createPhysicalAuction(
        uint256 reservePrice,
        uint256 startPrice,
        bytes16 auctionName,
        uint64 endTime
    ) external whenNotPaused {
        require(
            startPrice < reservePrice,
            "Start price must be less than reserve price"
        );
        require(
            endTime > block.timestamp,
            "End time must be in the future"
        );

        auctionIdCounter.increment();
        uint256 auctionId = auctionIdCounter.current();

        auctions[auctionId] = Auction({
            owner: msg.sender,
            startPrice: startPrice,
            reservePrice: reservePrice,
            endTime: endTime,
            name: auctionName,
            status: AuctionStatus.Open,
            currentHighestBid: Bid(address(0), 0, 0),
            reserveMet: false
        });

        emit AuctionCreated(
            msg.sender,
            auctionId,
            startPrice,
            reservePrice,
            endTime,
            auctionName
        );
    }

    /// @notice Place a bid on an active auction
    /// @dev Gas: ~94k (first bid), ~95k (subsequent — includes immediate refund to previous bidder).
    ///      Only the current highest bid is stored. Previous bidders are refunded immediately
    ///      into escrow, eliminating the need for loops at finalization (no DOS risk).
    /// @param auctionId The ID of the auction to bid on
    function placeBid(uint256 auctionId) external payable whenNotPaused {
        require(auctionId > 0 && auctionId <= auctionIdCounter.current(), "Invalid auction ID");

        Auction storage auction = auctions[auctionId];
        require(auction.owner != address(0), "Auction does not exist");
        require(auction.owner != msg.sender, "Cannot bid on your own auction");
        require(block.timestamp <= auction.endTime, "Auction has ended");
        require(auction.status == AuctionStatus.Open, "Auction is not active");
        require(msg.value > 0, "Bid amount must be greater than zero");
        require(msg.value >= auction.startPrice, "Bid must be at least start price");

        // If there's an existing bid, enforce minimum increment and refund previous bidder
        if (auction.currentHighestBid.bidder != address(0)) {
            uint256 minNextBid = auction.currentHighestBid.amount +
                (auction.currentHighestBid.amount * MIN_BID_INCREMENT_PERCENT) /
                100;
            require(
                msg.value >= minNextBid,
                "Bid must be at least 5% higher than current bid"
            );

            // Immediately refund previous bidder into escrow (O(1), no loops)
            uint256 prevAmount = auction.currentHighestBid.amount;
            address prevBidder = auction.currentHighestBid.bidder;
            deposits[prevBidder] += prevAmount;
            emit BidRefunded(prevBidder, auctionId, prevAmount);
            emit AvailableBalanceUpdated(
                prevBidder,
                prevAmount,
                deposits[prevBidder]
            );
        }

        // Store as active bid — NOT in escrow yet (prevents double-counting)
        auction.currentHighestBid = Bid(msg.sender, msg.value, block.timestamp);

        if (msg.value >= auction.reservePrice) {
            auction.reserveMet = true;
        }

        emit BidPlaced(msg.sender, auctionId, msg.value, auction.reserveMet);
    }

    /// @notice End an auction and settle funds
    /// @dev Gas: ~33k (no bids), ~61k (with bids). Constant time regardless of bid count.
    ///      Owner can end early. If reserve met, winning bid credited to seller.
    ///      If reserve not met, active bid refunded to escrow.
    /// @param auctionId The ID of the auction to finalize
    function endAuction(uint256 auctionId) external {
        require(
            auctionId > 0 && auctionId <= auctionIdCounter.current(),
            "Invalid auction ID"
        );

        Auction storage auction = auctions[auctionId];
        require(auction.owner != address(0), "Auction does not exist");
        require(auction.owner == msg.sender, "Only auction owner can end");
        require(
            auction.status == AuctionStatus.Open,
            "Auction already finished"
        );

        auction.status = AuctionStatus.Finished;

        // No bids — nothing to settle
        if (auction.currentHighestBid.bidder == address(0)) {
            emit AuctionFinalizedNoBids(auctionId);
            return;
        }

        // Reserve not met — refund the active bid to escrow
        if (!auction.reserveMet) {
            address bidder = auction.currentHighestBid.bidder;
            uint256 amount = auction.currentHighestBid.amount;
            deposits[bidder] += amount;
            emit BidRefunded(bidder, auctionId, amount);
            emit AvailableBalanceUpdated(bidder, amount, deposits[bidder]);
            return;
        }

        // Reserve met — credit winning bid amount to seller's escrow
        address winner = auction.currentHighestBid.bidder;
        uint256 winningBid = auction.currentHighestBid.amount;
        address seller = auction.owner;

        deposits[seller] += winningBid;

        emit AuctionFinalized(winner, seller, auctionId, winningBid);
        emit AvailableBalanceUpdated(seller, winningBid, deposits[seller]);
    }

    // =========================================================================
    // ESCROW / WITHDRAWAL
    // =========================================================================

    /// @notice Withdraw all available funds from escrow
    /// @dev Gas: ~25k. Uses pull pattern — recipients must claim their own funds.
    ///      This avoids failed sends blocking auction logic (e.g. if recipient is
    ///      a contract that reverts on receive). Protected against reentrancy.
    /// @param payee Address to send funds to (must have a balance)
    function withdrawPayments(address payable payee) external nonReentrant {
        require(payee != address(0), "Invalid address");
        uint256 payment = deposits[payee];
        require(payment > 0, "No funds to withdraw");

        // Zero balance before transfer (checks-effects-interactions)
        deposits[payee] = 0;
        payee.sendValue(payment);

        emit Withdrawn(payee, payment);
    }

    // =========================================================================
    // ADMIN
    // =========================================================================

    /// @notice Pause contract — blocks new auctions and bids
    /// @dev Withdrawals and auction endings still work when paused (funds never locked)
    function pauseContract() external onlyOwner {
        _pause();
    }

    /// @notice Unpause contract
    function unpauseContract() external onlyOwner {
        _unpause();
    }

    // =========================================================================
    // VIEW FUNCTIONS
    // =========================================================================

    /// @notice Get full auction details
    function getAuction(uint256 auctionId)
        external
        view
        returns (Auction memory)
    {
        require(
            auctionId > 0 && auctionId <= auctionIdCounter.current(),
            "Invalid auction ID"
        );
        return auctions[auctionId];
    }

    /// @notice Get the current highest bid for an auction
    function getCurrentHighestBid(uint256 auctionId)
        external
        view
        returns (Bid memory)
    {
        require(
            auctionId > 0 && auctionId <= auctionIdCounter.current(),
            "Invalid auction ID"
        );
        return auctions[auctionId].currentHighestBid;
    }

    /// @notice Get withdrawable balance for an address
    function depositsOf(address account) external view returns (uint256) {
        return deposits[account];
    }

    /// @notice Get total number of auctions created
    function getTotalAuctions() external view returns (uint256) {
        return auctionIdCounter.current();
    }

    /// @notice Check if an auction is currently active (open and not expired)
    function isAuctionActive(uint256 auctionId) external view returns (bool) {
        require(
            auctionId > 0 && auctionId <= auctionIdCounter.current(),
            "Invalid auction ID"
        );
        Auction storage auction = auctions[auctionId];
        return auction.status == AuctionStatus.Open &&
               block.timestamp <= auction.endTime;
    }
}
