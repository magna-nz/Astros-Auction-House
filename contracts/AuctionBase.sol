// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "../interfaces/IAuction.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

struct AuctionBid{
    address payable bidder;
    uint bid;
    uint timestamp;
}

enum AuctionStatus { Open, Finished }


contract AuctionBase is IAuction, Ownable{
    bool public hasEnded;
    uint public reservePrice;
    uint public startPrice;
    uint public startTime;
    uint public auctionId;
    bytes32 public auctionName; //override
    AuctionBid[] bids;
    address public auctionOwner;
    AuctionStatus public auctionStatus;

    constructor(uint _reservePrice,
                uint _startPrice,
                address _ahAddress,
                string _auctionName,
                uint _auctionId) {

        _owner = _ahAddress; //owner of this is auction house address which will call methods on this
        reservePrice = _reservePrice;
        startPrice = _startPrice;
        startTime = block.timestamp;
        auctionName = _auctionName;
        auctionOwner = tx.origin;
        auctionId = _auctionId;
        auctionStatus = AuctionStatus.Open;
    }

   function getLastBid() external pure returns(AuctionBid){
       return bids[bids.length-1];
   }

   function makeBid() external returns (bool){
       
   }
   function removeBid() external returns (bool){

   } 
}
