// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import "./AuctionBase.sol";
import "./PhysicalAuction.sol";

contract AuctionHouse{// is Ownable{ (TODO: ownable here causes ganache to not let us view details. Fix)
    uint public numberOfAuctions = 0;
    event AuctionCreated(address indexed _auctionOwner, uint indexed _auctionId, uint _startPrice, uint _reservePrice, address indexed _auctionContract);
    event AuctionBidSuccessful(address indexed _bidderAddress, uint indexed _auctionId, uint bidValue);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint indexed _auctionId);

    mapping(uint => address) auctions; //auction ID => Auction child contract
    mapping(address => uint[]) public auctionsRunByUser; //points to index in auctions the current user has

    constructor() {
    }


    function createPhysicalAuction(uint _reservePrice, uint _startPrice, bytes32 _auctionName) external {
        require(_startPrice < _reservePrice, "Invalid start price");
        uint auctionId = numberOfAuctions++;

        address auction = address(new PhysicalAuction(_reservePrice, _startPrice, address(this),
                                                 _auctionName, auctionId));
        
        auctions[auctionId] = auction;
        auctionsRunByUser[msg.sender].push(auctionId);
                //Contract con = Contract(auctions[auctionId]);
        
        emit AuctionCreated(msg.sender, auctionId, _startPrice, _reservePrice, auction);
    }
}
