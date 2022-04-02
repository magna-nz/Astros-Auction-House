// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import "../interfaces/IAuction.sol";
import "./AuctionEscrow.sol";


struct AuctionBid{
    address bidder;
    uint256 bid;
    uint256 timestamp;
}

enum AuctionStatus { Open, Finished }


abstract contract Auction is IAuction, AuctionEscrow{
    event AuctionBidSuccessful(address indexed _bidderAddress, uint256 indexed _auctionId, uint bidValue, bool reserveMet);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint256 indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint256 indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint256 indexed _auctionId);
    event AvailableBalanceUpdated(address indexed _balanceHolder, uint256 amountChanged, uint256 newBalance);

    modifier isAuctionHouse{
        require(msg.sender == auctionHouse);
        _;
    }

    //todo: refactor for variable packing
    bool public hasEnded;
    bool public reserveMet;
    uint public reservePrice;
    uint public startPrice;
    uint public startTime;
    uint public endTime;
    uint public auctionId;
    bytes16 public auctionName;
    AuctionBid[] public bids;
    address public auctionOwner;
    AuctionStatus public auctionStatus;
    address public auctionHouse;
    address private ahAddress;
    address private _highestBidder;
    address public auctionWinner;


    constructor(uint256 _reservePrice,
                uint256 _startPrice,
                address _auctionHouse,
                bytes16 _auctionName,
                uint256 _auctionId,
                uint256 _endTime,
                address _auctionOwner) {

        auctionHouse = _auctionHouse; //owner of this is auction house address which will call methods on this
        reservePrice = _reservePrice;
        startPrice = _startPrice;
        startTime = block.timestamp;
        endTime = _endTime;
        auctionName = _auctionName;
        auctionOwner = _auctionOwner;
        auctionId = _auctionId;
        auctionStatus = AuctionStatus.Open;
    }


  //todo: safe math  here
   function getLastBid() external view returns(AuctionBid memory){
       return bids[bids.length-1];
   }

   function close() internal virtual {
       if (this.reserveMet()){
           assert(bids.length >= 0);
           AuctionBid memory lastBid = this.getLastBid();
           auctionWinner = lastBid.bidder;
       }
       hasEnded = true;
       auctionStatus = AuctionStatus.Finished;
   }

   function getBids() public view returns (AuctionBid[] memory){
       return bids;
   }

   //can remove
   function makeBid() external returns (bool){

   }


   function removeBid() external returns (bool){

   }

   function getBidCount() public view returns(uint count) {
    return bids.length;
    }

    function getBidByIndex(uint _index) public view returns (AuctionBid memory){
        assert(_index <= bids.length);
        return bids[_index];
    }

    function placeBidOnAuction(AuctionBid memory auctionBid) internal {
        bids.push(auctionBid);
    }

    function updateIfReserveMet(uint bidValue, address bidder) internal {
        if (bidValue >= reservePrice){
            reserveMet = true;
            _highestBidder = bidder;
        }
    }

    function setAuctionStatus(AuctionStatus status) internal {
        require(this.auctionStatus() != AuctionStatus.Finished, "Auction is already finished");
        auctionStatus = status;
    }


    function placeBid(address bidder, uint bidAmount) external payable virtual;
    function endAuction(address caller) external payable virtual;
    function processPayouts() internal virtual;


    //Anyone can call withdrawal to remove funds directly, or do it via the auctionhouse.
    //Only this contract can withdraw funds from escrow.
    function withdraw(address payable payee) public override {
        require(this.hasEnded(), "Auction is still running. Cannot withdraw bid");
        require(super.depositsOf(payee) > 0, "Nothing to withdraw");
        super.withdraw(payee);
    }
}
