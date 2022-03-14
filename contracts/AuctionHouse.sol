// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./AuctionBase.sol";
import "./PhysicalAuction.sol";

contract AuctionHouse is Ownable{
    uint public numberofAuctions = 0;

    event AuctionCreated(address indexed _auctionOwner, uint indexed _auctionId, uint _startPrice, uint _reservePrice);
    event AuctionBidSuccessful(address indexed _bidderAddress, uint indexed _auctionId, uint bidValue);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint indexed _auctionId);

    mapping(uint => address) auctions; //auction ID => Auction child contract
    mapping(address => uint[]) public auctionsRunByUser; //points to index in auctions the current user has

    constructor() {
        _owner = msg.sender;
    }


    function createPhysicalAuction(uint _reservePrice, uint _startPrice, string _message) external {
        require(_startPrice < _reservePrice, "starting price of auction has to be less than reserve price");
        uint memory auctionId = numberofAuctions++;

        address newAuction = new PhysicalAuction(_reservePrice, _startPrice, address(this),
                                                 _auctionName, auctionId);
        
        auctions[auctionId] = newAuction;
        auctionsRunByUser[msg.sender].push(auctionId);
                //Contract con = Contract(newContracts[0]);
        
        emit AuctionCreated(msg.sender, auctionIndex, _startPrice, _reservePrice);
    }
}
