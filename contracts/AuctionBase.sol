// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "../interfaces/IAuction.sol";
import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";

struct AuctionBid{
    address payable bidder;
    uint bid;
    uint timestamp;
}

enum AuctionStatus { Open, Finished }

//todo: move IAuctoin to derived class
contract AuctionBase is IAuction, Ownable{ //
    bool public hasEnded;
    uint public reservePrice;
    uint public startPrice;
    uint public startTime;
    uint public auctionId;
    bytes32 public auctionName; //override
    AuctionBid[] public bids;
    address public auctionOwner;
    AuctionStatus public auctionStatus;
    address private ahAddress;

    constructor(uint _reservePrice,
                uint _startPrice,
                address _ahAddress,
                bytes32 _auctionName,
                uint _auctionId) {

        ahAddress = _ahAddress; //owner of this is auction house address which will call methods on this
        reservePrice = _reservePrice;
        startPrice = _startPrice;
        startTime = block.timestamp;
        auctionName = _auctionName;
        auctionOwner = tx.origin;
        auctionId = _auctionId;
        auctionStatus = AuctionStatus.Open;
    }

   function getLastBid() external view returns(AuctionBid memory){
       return bids[bids.length-1];
   }

   function makeBid() external returns (bool){

   }
   function removeBid() external returns (bool){

   } 

   function getBidCount() public view returns(uint count) {
    return bids.length;
    }

    function getBidByIndex(uint _index) public view returns (AuctionBid memory){
        //if statement? require? assert?
        require(bids.length <= _index, "index out of bounds");
        return bids[_index];
    }

    function placeBidOnAuction(AuctionBid memory auctionBid) public {
        bids.push(auctionBid);
    }
}
