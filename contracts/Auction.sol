// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "../interfaces/IAuction.sol";
import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";

struct AuctionBid{
    address bidder;
    uint bid;
    uint timestamp;
}

enum AuctionStatus { Open, Finished }

//todo: move IAuctoin to derived class
//todo: change name of class to just auction
contract Auction is IAuction, Ownable{
    //todo: refactor for variable packing
    bool public hasEnded = auctionStatus == AuctionStatus.Finished;
    bool public reserveMet = false;
    uint public reservePrice;
    uint public startPrice;
    uint public startTime;
    uint public endTime;
    uint public auctionId;
    bytes32 public auctionName; //override
    AuctionBid[] public bids;
    address public auctionOwner;
    AuctionStatus public auctionStatus;
    address private ahAddress;
    address private _highestBidder;
    address public auctionWinner;


    constructor(uint _reservePrice,
                uint _startPrice,
                address _ahAddress,
                bytes32 _auctionName,
                uint _auctionId,
                uint256 _endTime) {

        ahAddress = _ahAddress; //owner of this is auction house address which will call methods on this
        reservePrice = _reservePrice;
        startPrice = _startPrice;
        startTime = block.timestamp;
        endTime = _endTime;
        auctionName = _auctionName;
        auctionOwner = tx.origin;
        auctionId = _auctionId;
        auctionStatus = AuctionStatus.Open;
    }

   function getLastBid() external view returns(AuctionBid memory){
       return bids[bids.length-1];
   }

   function close() public {
       AuctionBid memory lastBid = this.getLastBid();
       auctionWinner = lastBid.bidder;
       auctionStatus = AuctionStatus.Finished;
   }

   //todo why can't we get it from public var?
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
        //if statement? require? assert?
        assert(_index <= bids.length);
        return bids[_index];
    }

    function placeBidOnAuction(AuctionBid memory auctionBid) public {
        //highestBidder = 
        bids.push(auctionBid);
    }

    function updateIfReserveMet(uint bidValue, address bidder) public{
        if (bidValue >= reservePrice){
            reserveMet = true;
            _highestBidder = bidder;
        }
    }

    function setAuctionStatus(AuctionStatus status) public{
        require(this.auctionStatus() != AuctionStatus.Finished, "Auction is already finished");
        auctionStatus = status;
    }
}
