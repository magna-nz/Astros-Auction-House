// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Counters.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "./Auction.sol";
import "./PhysicalAuction.sol";

contract AuctionHouse{// is Ownable{ (TODO: ownable here causes ganache to not let us view details. Fix)
    using Counters for Counters.Counter;
    using SafeMath for uint;

    Counters.Counter public numberOfAuctions;
    Counters.Counter private _auctionIdCounter;
    event AuctionCreated(address indexed _auctionOwner, uint indexed _auctionId, uint _startPrice, uint _reservePrice, address indexed _auctionContract, uint _endTime);
    event AuctionBidSuccessful(address indexed _bidderAddress, uint indexed _auctionId, uint bidValue, bool reserveMet);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint indexed _auctionId);
    event AvailableBalanceUpdated(address indexed _balanceHolder, uint indexed _auctionId, uint amountChanged, uint newBalance);

    mapping(uint => address) auctions; //auction ID => Auction child contract
    mapping(address => uint[]) public auctionsRunByUser; //points to index in auctions the current user has
    mapping(address => uint[]) public auctionsBidOnByUser; //points to index of bids the user has on auctions
    mapping(address => uint) public lockedBalanceInBids; //balance locked in bids for auctions as of current
    mapping(address => uint) public availableBalanceToWithdraw; //available balance for them to withdraw
    mapping(address => uint[]) public auctionsWonByUser;


    constructor() {
    }


    function createPhysicalAuction(uint _reservePrice, uint _startPrice, bytes32 _auctionName, uint256 _endTime) external {
        require(_startPrice < _reservePrice, "Invalid start price");
        _auctionIdCounter.increment(); //not incrementing. use Counter.Counter

        address auction = address(new PhysicalAuction(_reservePrice, _startPrice, address(this),
                                                 _auctionName, _auctionIdCounter.current(), _endTime));
        numberOfAuctions.increment();
        auctions[_auctionIdCounter.current()] = auction;
        auctionsRunByUser[msg.sender].push(_auctionIdCounter.current());
                //Contract con = Contract(auctions[auctionId]);
        
        emit AuctionCreated(msg.sender, _auctionIdCounter.current(), _startPrice, _reservePrice, auction, _endTime);
    }

    //get highest bid for auction

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


    function endAuction(uint _auctionId) external {
        Auction auction = Auction(auctions[_auctionId]);
        require(address(auction) != address(0), "auction ID does not exist");
        require(msg.sender == auction.auctionOwner(), "only the auction owner can close an auction");
        require(auction.auctionStatus() != AuctionStatus.Finished, "auction is already finished");
        completeAuction(auction);
    }

    //Place a bid on an auction
    //todo: validate first bid is greater than start price
    function placeBid(uint _auctionId) external payable {
        Auction auction = Auction(auctions[_auctionId]);
        require(auction.auctionOwner() != msg.sender, "You can't bid on your own auction");
        require(block.timestamp <= auction.endTime(), "Auction has expired.");
        require(auction.auctionStatus() != AuctionStatus.Finished, "You can't bid on an auction that's ended");
        
        //get the last bid and compare it if there's already a bid on it
        if (auction.getBidCount() != 0){
            AuctionBid memory lastAuctionBid = auction.getBidByIndex(auction.getBidCount().sub(1)); //todo: safemath
            //lastAuctionBid = auction.bids[auction.getBidCount() - 1];   
            require(msg.value > lastAuctionBid.bid, "bid not high enough");
        }
        
        //add the bid to the auction
        AuctionBid memory newAuctionBid = AuctionBid({
            bid: msg.value,
            bidder: msg.sender,
            timestamp: block.timestamp //todo: timestamp can be manipulated by miner
        });


        auction.placeBidOnAuction(newAuctionBid);

        auction.updateIfReserveMet(msg.value, msg.sender);

        auctionsBidOnByUser[msg.sender].push(_auctionId);

        //keep a track of locked funds for someone bidding
        lockedBalanceInBids[msg.sender] += msg.value;
        
        emit AuctionBidSuccessful(msg.sender, _auctionId, msg.value, auction.reserveMet());
    }

    function completeAuction(Auction auction) private {
       auction.close();
       require(auction.auctionStatus() == AuctionStatus.Finished, "Auction isn't finished yet");
       processPayouts(auction);
    }

    function processPayouts(Auction auction) private {
        bool isReserveMet = auction.reserveMet();
        AuctionBid[] memory auctionBids = auction.getBids();
        
        //if theres no bids, theres nothing to payout
        if (auctionBids.length == 0){
            emit AuctionEndedWithNoWinningBid(auction.auctionId());
            return;
        }

        //if reserve isnt met, refund them all\
        if (isReserveMet){

            AuctionBid memory lastBid = auctionBids[auctionBids.length - 1];

            //delete p the last bid off since we will process the final bid separately
            delete auctionBids[auctionBids.length-1];

            //Pay the Winner
            //use the last bid and move funds around
            lockedBalanceInBids[lastBid.bidder] -= (lastBid.bid);
            availableBalanceToWithdraw[auction.auctionOwner()] += lastBid.bid;
            auctionsWonByUser[lastBid.bidder].push(auction.auctionId());
            emit AuctionEndedWithWinningBid(lastBid.bidder, auction.auctionId());
        }
        else{
            emit AuctionEndedWithNoWinningBid(auction.auctionId());
        }

        //refund all the bidders that needed to be refunded
        //if reserve was met it won't refund the last bid as that's already been transferred
        //to the auctionOwner above
        for (uint i = 0; i < auctionBids.length; i++){
            AuctionBid memory currentBid = auctionBids[i];

            //if you delete an item in memory, it zeros it out, the length is still the same
            //if its a zero address dont bother
            if (currentBid.bidder == address(0)){
                continue;
            }
            //send value from locked balance for address -> available balance. This can be withdrawn by a user.
            //we need proper exception handling here for if there isn't enough in locked balance. shouldnt ever be the case
            lockedBalanceInBids[currentBid.bidder] -= currentBid.bid;
            availableBalanceToWithdraw[currentBid.bidder] += currentBid.bid;
            emit AuctionBidRefunded(currentBid.bidder, auction.auctionId());
            emit AvailableBalanceUpdated(currentBid.bidder, auction.auctionId(), currentBid.bid, availableBalanceToWithdraw[currentBid.bidder]);
        }
    }
}
