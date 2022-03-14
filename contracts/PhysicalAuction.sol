// SPDX-License-Identifier: MIT

pragma solidity ^0.8.1;

import "./AuctionBase.sol";

contract PhysicalAuction is AuctionBase{

    constructor(uint _reservePrice,
                uint _startPrice,
                address _ahAddress,
                string _auctionName,
                uint _auctionId) 
    AuctionBase(_reservePrice, _startPrice, _ahAddress, _auctionName, _auctionId){

    }
}