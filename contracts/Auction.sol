// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "./AuctionEscrow.sol";

struct AuctionBid{
    address bidder;
    uint256 bid;
    uint256 timestamp;
}

enum AuctionStatus { Open, Finished }

abstract contract Auction is AuctionEscrow{
    event AuctionBidSuccessful(address indexed _bidderAddress, uint256 indexed _auctionId, uint bidValue, bool reserveMet);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint256 indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint256 indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint256 indexed _auctionId);
    event AvailableBalanceUpdated(address indexed _balanceHolder, uint256 amountChanged, uint256 newBalance);

    modifier isAuctionHouse{
        require(msg.sender == _auctionHouse);
        _;
    }

    //todo: refactor for variable packing

    ///@notice Check if auction has ended
    bool public hasEnded;

    ///@notice Check if reserve met
    bool public reserveMet;

    ///@notice The reserve price of the auction
    uint public reservePrice;

    ///@notice The start price of the auction
    uint public startPrice;

    ///@notice The starting timestamp
    uint public startTime;

    ///@notice The end time of the auction
    uint public endTime;

    ///@notice The ID of the auction
    uint public auctionId;

    ///@notice The name of the auction
    bytes16 public auctionName;

    ///@notice The list of bids placed on the auction
    AuctionBid[] public bids;

    ///@notice The owner of the auction
    address public auctionOwner;

    ///@notice The status of the auction. 0 for Open, 1 for Finished
    AuctionStatus public auctionStatus;

    ///@notice The winner of the auction
    address public auctionWinner;

    ///@notice The current highest bidder of the auction
    address public highestBidder;
    
    address private _auctionHouse;
    constructor(uint256 _reservePrice,
                uint256 _startPrice,
                address auctionHouse,
                bytes16 _auctionName,
                uint256 _auctionId,
                uint256 _endTime,
                address _auctionOwner) {

        _auctionHouse = auctionHouse; //owner of this is auction house address which will call methods on this
        reservePrice = _reservePrice;
        startPrice = _startPrice;
        startTime = block.timestamp;
        endTime = _endTime;
        auctionName = _auctionName;
        auctionOwner = _auctionOwner;
        auctionId = _auctionId;
        auctionStatus = AuctionStatus.Open;
    }


    /// @notice Get the last bid of the auction
    /// @return The last auction bid
    function getLastBid() external view returns(AuctionBid memory){
        require(bids.length > 0, "Cant get last bid unless theres a previous bid");
        return bids[bids.length-1];
    }

    /// @notice Get the last bid of the auction
    /// @dev Close the auction and assign the winner. todo: make this called external and move check that its the owner here
    function close() internal virtual {
       if (this.reserveMet()){
           assert(bids.length >= 0);
           AuctionBid memory lastBid = this.getLastBid();
           auctionWinner = lastBid.bidder;
       }
       hasEnded = true;
       auctionStatus = AuctionStatus.Finished;
    }

    /// @notice Get all the bids of the auction
    /// @return The bids on the auction
    function getBids() internal view returns (AuctionBid[] memory){
        return bids;
    }

    /// @notice Get the number of bids on the auction
    /// @return count The number of bids on the auction
    function getBidCount() external view returns(uint count) {
        return bids.length;
    }

    /// @notice Get a bid by its index
    /// @dev Get bids by index
    /// @return An auction bid
    function getBidByIndex(uint index) external view returns (AuctionBid memory){
        assert(index <= bids.length);
        return bids[index];
    }


    function placeBidOnAuction(AuctionBid memory auctionBid) internal {
        bids.push(auctionBid);
    }

    function updateIfReserveMet(uint bidValue, address bidder) internal {
        if (bidValue >= reservePrice){
            reserveMet = true;
            highestBidder = bidder;
        }
    }

    /// @notice Place a bid on an auction
    /// @dev Place bid on an auction. Must be overriden
    function placeBid(address bidder, uint bidAmount) external payable virtual;

    /// @notice End an auction.
    /// @dev End an auction. Must be overridden
    function endAuction(address caller) external payable virtual;

    /// @notice Withdraw money in contract escrow if available
    /// @dev Anyone can call withdrawal to remove funds directly, or do it via the auctionhouse.
    /// Only this contract can withdraw funds from escrow.
    function withdraw(address payable payee) public override{
        require(this.hasEnded(), "Auction is still running. Cannot withdraw bid");
        require(super.depositsOf(payee) > 0, "Nothing to withdraw");
        super.withdraw(payee);
    }
}
