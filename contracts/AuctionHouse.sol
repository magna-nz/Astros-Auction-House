// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Counters.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import ".././node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";
import ".././node_modules/@openzeppelin/contracts/security/Pausable.sol";
import "./Auction.sol";
import "./PhysicalAuction.sol";
//import "./NFTAuction.sol";



contract AuctionHouse is ReentrancyGuard, Ownable, Pausable{
    modifier isContractActive() {
        require(block.number <= 9999999999); //placeholder
        _;
    }

    using Counters for Counters.Counter;
    using SafeMath for uint;

    event AuctionCreated(address indexed _auctionOwner, uint256 indexed _auctionId, uint256 _startPrice, uint256 _reservePrice, address indexed _auctionContract, uint64 _endTime);
    event ContractValueReceived(address _messageSender, uint amount);

    Counters.Counter private _auctionIdCounter;
    mapping(uint256 => PhysicalAuction) private physicalAuctions; //auction ID => Physical Auction child contract
    
    constructor() {
    }


    function pauseContract() onlyOwner external {
        super._pause();
    }

    function unpauseContract() onlyOwner external {
        super._unpause();
    }

    /*
    Creates a physical auction
    */

    function createPhysicalAuction(uint256 reservePrice, uint256 startPrice, bytes16 auctionName, uint64 endTime) whenNotPaused isContractActive external {
        require(startPrice < reservePrice, "Invalid start price");
        _auctionIdCounter.increment();

        PhysicalAuction auction = new PhysicalAuction(reservePrice, startPrice, address(this),
                                                 auctionName, _auctionIdCounter.current(), endTime, msg.sender);

        physicalAuctions[_auctionIdCounter.current()] = auction;
        
        emit AuctionCreated(msg.sender, _auctionIdCounter.current(), startPrice, reservePrice, address(auction), endTime);
    }

    /*
    End an auction.
    Right now the auction Owner has to end it, so they have to pay to end
    In future, I would like to read from an oracle about the state and update it that way
    */

    function endPhysicalAuction(uint256 auctionId) isContractActive external {
        PhysicalAuction auction = physicalAuctions[auctionId];
        require(address(auction) != address(0), "Auction ID does not exist");
        auction.endAuction(msg.sender);
    }

    function placeBidPhysicalAuction(uint256 auctionId) whenNotPaused isContractActive external payable {
        PhysicalAuction auction = physicalAuctions[auctionId];
        require(address(auction) != address(0), "Auction ID does not exist");
        auction.placeBid{value:msg.value}(msg.sender, msg.value);
    }

    function withdrawPayments(uint auctionId, address payable payee) external isContractActive {
        PhysicalAuction auction = physicalAuctions[auctionId];
        auction.withdraw(payee);
    }
}
