// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../contracts/Auction.sol";

interface IAuction {
   function getLastBid() external view returns(AuctionBid memory);
   function makeBid() external returns (bool);
   function removeBid() external returns (bool); //only if its the latest bids
}