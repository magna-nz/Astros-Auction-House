// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Counters.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import ".././node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";
import ".././node_modules/@openzeppelin/contracts/security/Pausable.sol";
import "./Auction.sol";
import "./PhysicalAuction.sol";

/// @title An auction house to trade
/// @author Daniel Anderson
/// @notice This contract can be used to place an auction, bid on an auction and end an auction
/// @dev Calls external auction to interact with. Funds are stored in escrow until auction over.
contract AuctionHouse is ReentrancyGuard, Ownable, Pausable{

    modifier isContractActive() {
        require(block.number <= 9999999999); //placeholder
        _;
    }

    using Counters for Counters.Counter;
    using SafeMath for uint;

    ///@notice Emitted when an auction is created
    event AuctionCreated(address indexed _auctionOwner, uint256 indexed _auctionId, uint256 _startPrice, uint256 _reservePrice, address indexed _auctionContract, uint64 _endTime);

    ///@dev Incrementer for auction
    Counters.Counter private _auctionIdCounter;

    ///@dev auction ID -> physical auction
    mapping(uint256 => PhysicalAuction) private physicalAuctions;
    
    constructor() {
    }

    /// @notice Pauses the contract so no bids or auctions can be created
    /// @dev Pauses auction activities, bids but withdrawals still allowed
    function pauseContract() onlyOwner external {
        super._pause();
    }

    /// @notice Unpauses the contract so  bids and auctions can be created
    /// @dev Unpauses auction activities
    function unpauseContract() onlyOwner external {
        super._unpause();
    }

    /// @notice Create a physical auction to sell your posession
    /// @dev Create a physical auction and store the ID in state
    /// @param reservePrice The reserve price of the auction
    /// @param startPrice The start price of the auction
    /// @param auctionName The name of the auction
    /// @param endTime The end time of the auction
    function createPhysicalAuction(uint256 reservePrice, uint256 startPrice, bytes16 auctionName, uint64 endTime) whenNotPaused isContractActive external {
        require(startPrice < reservePrice, "Invalid start price");
        _auctionIdCounter.increment();

        PhysicalAuction auction = new PhysicalAuction(reservePrice, startPrice, address(this),
                                                 auctionName, _auctionIdCounter.current(), endTime, msg.sender);

        physicalAuctions[_auctionIdCounter.current()] = auction;
        
        emit AuctionCreated(msg.sender, _auctionIdCounter.current(), startPrice, reservePrice, address(auction), endTime);
    }


    /// @notice End a physical auction as the owner
    /// @dev Ends physical auction of the owner and distribute escrow payments
    /// @param auctionId The ID of the auction to end
    function endPhysicalAuction(uint256 auctionId) isContractActive external {
        PhysicalAuction auction = physicalAuctions[auctionId];
        require(address(auction) != address(0), "Auction ID does not exist");
        auction.endAuction(msg.sender);
    }

    /// @notice Place a bid on a physical auction
    /// @dev Place a bid on a physical auction and store funds in escrow contract
    /// @param auctionId The ID of the auction to place a bid on
    function placeBidPhysicalAuction(uint256 auctionId) whenNotPaused isContractActive external payable {
        PhysicalAuction auction = physicalAuctions[auctionId];
        require(address(auction) != address(0), "Auction ID does not exist");
        auction.placeBid{value:msg.value}(msg.sender, msg.value);
    }

    /// @notice Withdraw funds from any auctions that have ended
    /// @dev Withdraw funds out of escrow for any auctions that have ended where payments were distributed
    /// @param auctionId The ID of the auction to withdraw owed payments from
    function withdrawPayments(uint auctionId, address payable payee) external isContractActive {
        PhysicalAuction auction = physicalAuctions[auctionId];
        auction.withdraw(payee);
    }
}
