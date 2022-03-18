// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Counters.sol";
import "./AuctionBase.sol";
import "./PhysicalAuction.sol";


contract AuctionHouse{// is Ownable{ (TODO: ownable here causes ganache to not let us view details. Fix)
    using Counters for Counters.Counter;
    Counters.Counter public numberOfAuctions;
    Counters.Counter private _auctionIdCounter;
    event AuctionCreated(address indexed _auctionOwner, uint indexed _auctionId, uint _startPrice, uint _reservePrice, address indexed _auctionContract);
    event AuctionBidSuccessful(address indexed _bidderAddress, uint indexed _auctionId, uint bidValue);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint indexed _auctionId);

    mapping(uint => address) auctions; //auction ID => Auction child contract
    mapping(address => uint[]) public auctionsRunByUser; //points to index in auctions the current user has
    mapping(address => uint[]) public auctionsBidOnByUser; //points to index of bids the user has on auctions
    mapping(address => uint) public lockedBalanceInBids; //balance locked in bids for auctions as of current


    constructor() {
    }


    function createPhysicalAuction(uint _reservePrice, uint _startPrice, bytes32 _auctionName) external {
        require(_startPrice < _reservePrice, "Invalid start price");
        _auctionIdCounter.increment(); //not incrementing. use Counter.Counter

        address auction = address(new PhysicalAuction(_reservePrice, _startPrice, address(this),
                                                 _auctionName, _auctionIdCounter.current()));
        numberOfAuctions.increment();
        auctions[_auctionIdCounter.current()] = auction;
        auctionsRunByUser[msg.sender].push(_auctionIdCounter.current());
                //Contract con = Contract(auctions[auctionId]);
        
        emit AuctionCreated(msg.sender, _auctionIdCounter.current(), _startPrice, _reservePrice, auction);
    }

    //Get the bids on an auction by its Auction ID
    // function getAuctionBidsOnByAuctionId(uint _auctionId) public view returns (AuctionBid[] memory){
    //     PhysicalAuction addy = PhysicalAuction(auctions[_auctionId]);
    //     return addy.bids();
    // }

    //Get auctions owned by a user
    //todo: gas consumption
    //This will only be called externally, and therefore shouldn't cost any gas
    //https://ethereum.stackexchange.com/questions/52885/view-pure-gas-usage-cost-gas-if-called-internally-by-another-function/52887#52887
    //only internal calls inside would
    // function getAuctionsRunByUser(address _address) external view returns (address[] memory){
    //     require(msg.sender == _address, "you can only see auctions run by yourself");
        
    //     uint[] memory userAuctionIds = auctionsRunByUser[_address];
    //     address[] memory userAuctionContracts;

    //     for (uint i = 0; i < userAuctionIds.length; i++){
    //         uint auctionId = userAuctionIds[i];
    //         userAuctionContracts[i] = auctions[auctionId];
    //     }

    //     return userAuctionContracts;
    // }

    //Place a bid on an auction
    function placeBid(uint _auctionId) external payable {
        AuctionBase auction = AuctionBase(auctions[_auctionId]);
        require(auction.auctionStatus() != AuctionStatus.Finished, "You can't bid on an auction that's ended");
        require(auction.auctionOwner() != msg.sender, "You can't bid on your own auction");

        //get the last bid and compare it if there's already a bid on it
        if (auction.getBidCount() != 0){
            AuctionBid memory lastAuctionBid = auction.getBidByIndex(auction.getBidCount() - 1); //todo: safemath
            //lastAuctionBid = auction.bids[auction.getBidCount() - 1];   
            require(msg.value >= lastAuctionBid.bid, "bid not high enough");
        }
        
        //add the bid to the auction
        AuctionBid memory newAuctionBid = AuctionBid({
            bid: msg.value,
            bidder: payable(msg.sender),
            timestamp: block.timestamp //todo: timestamp can be manipulated by miner
        });

        auction.placeBidOnAuction(newAuctionBid);
        auctionsBidOnByUser[msg.sender].push(_auctionId);

        //keep a track of locked funds for someone bidding
        lockedBalanceInBids[msg.sender] += msg.value;
        emit AuctionBidSuccessful(msg.sender, _auctionId, msg.value);
    }
}
