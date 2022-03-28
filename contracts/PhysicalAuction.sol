// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "./Auction.sol";

contract PhysicalAuction is Auction{

    constructor(uint _reservePrice,
                uint _startPrice,
                address _ahAddress,
                bytes32 _auctionName,
                uint _auctionId,
                uint256 _endTime,
                address _auctionOwner) 
    Auction(_reservePrice, _startPrice, _ahAddress, _auctionName, _auctionId, _endTime, _auctionOwner){

    }
}