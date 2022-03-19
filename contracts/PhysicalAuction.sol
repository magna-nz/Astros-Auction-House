// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "./Auction.sol";

contract PhysicalAuction is Auction{

    constructor(uint _reservePrice,
                uint _startPrice,
                address _ahAddress,
                bytes32 _auctionName,
                uint _auctionId) 
    Auction(_reservePrice, _startPrice, _ahAddress, _auctionName, _auctionId){

    }
}