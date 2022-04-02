// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/Auction.sol";

interface IAuction {
   function placeBid(address bidder, uint bidAmount) external payable;
   function endAuction(address caller) external payable;
   
}