// SPDX-License-Identifier: MIT
pragma solidity 0.8.10;

import "../interfaces/IAuction.sol";
import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/security/PullPayment.sol";


struct AuctionBid{
    address bidder;
    uint bid;
    uint timestamp;
}

enum AuctionStatus { Open, Finished }


abstract contract Auction is IAuction, PullPayment{
    event AuctionBidSuccessful(address indexed _bidderAddress, uint256 indexed _auctionId, uint bidValue, bool reserveMet);
    event AuctionEndedWithWinningBid(address indexed _winningBidder, uint256 indexed _auctionId);
    event AuctionEndedWithNoWinningBid(uint256 indexed _auctionId);
    event AuctionBidRefunded(address indexed _bidderRefunded, uint256 indexed _auctionId);
    event AvailableBalanceUpdated(address indexed _balanceHolder, uint256 amountChanged, uint256 newBalance);

    modifier isAuctionHouse{
        require(msg.sender == auctionHouse);
        _;
    }

    //todo: refactor for variable packing
    bool public hasEnded;
    bool public reserveMet;
    uint public reservePrice;
    uint public startPrice;
    uint public startTime;
    uint public endTime;
    uint public auctionId;
    bytes16 public auctionName;
    AuctionBid[] public bids;
    address public auctionOwner;
    AuctionStatus public auctionStatus;
    address public auctionHouse;
    address private ahAddress;
    address private _highestBidder;
    address public auctionWinner;


    constructor(uint256 _reservePrice,
                uint256 _startPrice,
                address _auctionHouse,
                bytes16 _auctionName,
                uint256 _auctionId,
                uint256 _endTime,
                address _auctionOwner) {

        auctionHouse = _auctionHouse; //owner of this is auction house address which will call methods on this
        reservePrice = _reservePrice;
        startPrice = _startPrice;
        startTime = block.timestamp;
        endTime = _endTime;
        auctionName = _auctionName;
        auctionOwner = _auctionOwner;
        auctionId = _auctionId;
        auctionStatus = AuctionStatus.Open;
        //auctionHouse = _auctionHouse;
    }

   function getLastBid() external view returns(AuctionBid memory){
       return bids[bids.length-1];
   }

   function close() internal virtual {
       if (this.reserveMet()){
           assert(bids.length >= 0);
           AuctionBid memory lastBid = this.getLastBid();
           auctionWinner = lastBid.bidder;
       }
       hasEnded = true;
       auctionStatus = AuctionStatus.Finished;
   }

   //todo why can't we get it from public var?
   function getBids() public view returns (AuctionBid[] memory){
       return bids;
   }

   //can remove
   function makeBid() external returns (bool){

   }


   function removeBid() external returns (bool){

   } 

   function getBidCount() public view returns(uint count) {
    return bids.length;
    }

    function getBidByIndex(uint _index) public view returns (AuctionBid memory){
        //if statement? require? assert?
        assert(_index <= bids.length);
        return bids[_index];
    }

    function placeBidOnAuction(AuctionBid memory auctionBid) internal {
        bids.push(auctionBid);
    }

    function updateIfReserveMet(uint bidValue, address bidder) internal {
        if (bidValue >= reservePrice){
            reserveMet = true;
            _highestBidder = bidder;
        }
    }

    function setAuctionStatus(AuctionStatus status) internal {
        require(this.auctionStatus() != AuctionStatus.Finished, "Auction is already finished");
        auctionStatus = status;
    }

    function placeBid(address bidder, uint bidAmount) external payable virtual;
    function endAuction(address caller) external virtual;
    function processPayouts() internal virtual;

    function withdrawPayments(address payable payee) public override {
        //require(caller == payee, "Can only trigger funds for your own address");
        require(this.payments(payee) > 0, "Nothing to withdraw");

        super.withdrawPayments(payee);
    }
    
    //  { whenNotPaused isContractActive 
    //     PhysicalAuction auction = PhysicalAuction(physicalAuctions[_auctionId]);
    //     require(auction.auctionOwner() != msg.sender, "You can't bid on your own auction");
    //     require(block.timestamp <= auction.endTime(), "Auction has expired.");
    //     require(auction.auctionStatus() != AuctionStatus.Finished, "You can't bid on an auction that's ended");
    //     require(msg.value > auction.startPrice(), "Auction must be greater than start price");

    //     //get the last bid and compare it if there's already a bid on it
    //     if (auction.getBidCount() != 0){
    //         AuctionBid memory lastAuctionBid = auction.getBidByIndex(auction.getBidCount().sub(1)); //todo: safemath
    //         //lastAuctionBid = auction.bids[auction.getBidCount() - 1];   
    //         require(msg.value > lastAuctionBid.bid, "bid not high enough");
    //     }
        
    //     //add the bid to the auction
    //     AuctionBid memory newAuctionBid = AuctionBid({
    //         bid: msg.value,
    //         bidder: msg.sender,
    //         timestamp: block.timestamp
    //     });


    //     auction.placeBidOnAuction(newAuctionBid);

    //     auction.updateIfReserveMet(msg.value, msg.sender);

    //     auctionsBidOnByUser[msg.sender].push(_auctionId);

    //     //keep a track of locked funds for someone bidding
    //     lockedBalanceInBids[msg.sender] += msg.value;
        
    //     emit AuctionBidSuccessful(msg.sender, _auctionId, msg.value, auction.reserveMet());
    // }
}
