// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Counters.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import ".././node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";
import ".././node_modules/@openzeppelin/contracts/security/Pausable.sol";
import "./Auction.sol";
import "./PhysicalAuction.sol";
import "./NFTAuction.sol";



contract AuctionHouse is ReentrancyGuard, Ownable, Pausable{
    using Counters for Counters.Counter;
    using SafeMath for uint;

    //Counters.Counter public numberOfAuctions;
    Counters.Counter private _auctionIdCounter;
    event AuctionCreated(address indexed _auctionOwner, uint256 indexed _auctionId, uint256 _startPrice, uint256 _reservePrice, address indexed _auctionContract, uint64 _endTime);
    // event AuctionBidSuccessful(address indexed _bidderAddress, uint256 indexed _auctionId, uint bidValue, bool reserveMet);
    // event AuctionEndedWithWinningBid(address indexed _winningBidder, uint256 indexed _auctionId);
    // event AuctionEndedWithNoWinningBid(uint256 indexed _auctionId);
    // event AuctionBidRefunded(address indexed _bidderRefunded, uint256 indexed _auctionId);
    // event AvailableBalanceUpdated(address indexed _balanceHolder, uint256 amountChanged, uint256 newBalance);
    event ContractValueReceived(address _messageSender, uint amount);

    mapping(uint256 => PhysicalAuction) private physicalAuctions; //auction ID => Physical Auction child contract
    //mapping(uint256 => NFTAuction) private nftAuctions;
    //mapping(address => uint256[]) public auctionsRunByUser; //points to index in auctions the current user has
    //mapping(address => uint256[]) public auctionsBidOnByUser; //points to index of bids the user has on auctions
    //mapping(address => uint256) public lockedBalanceInBids; //balance locked in bids for auctions as of current
    //mapping(address => uint256[]) public auctionsWonByUser;
    
    modifier isContractActive() {
    require(block.number <= 9999999999); //placeholder
    _;
}

    constructor() {
    }


    function pauseContract() onlyOwner public {
        super._pause();
    }

    function unpauseContract() onlyOwner public {
        super._unpause();
    }

    /*
    Creates an physical auction
    */

    function createPhysicalAuction(uint256 _reservePrice, uint256 _startPrice, bytes16 _auctionName, uint64 _endTime) whenNotPaused isContractActive external {
        require(_startPrice < _reservePrice, "Invalid start price");
        _auctionIdCounter.increment();

        PhysicalAuction auction = new PhysicalAuction(_reservePrice, _startPrice, address(this),
                                                 _auctionName, _auctionIdCounter.current(), _endTime, msg.sender);
        //numberOfAuctions.increment();
        physicalAuctions[_auctionIdCounter.current()] = auction;
        //auctionsRunByUser[msg.sender].push(_auctionIdCounter.current());
        
        emit AuctionCreated(msg.sender, _auctionIdCounter.current(), _startPrice, _reservePrice, address(auction), _endTime);
    }

    /*
    End an auction
    */

    function endPhysicalAuction(uint256 _auctionId) isContractActive external {
        // PhysicalAuction auction = PhysicalAuction(physicalAuctions[_auctionId]);
        PhysicalAuction auction = physicalAuctions[_auctionId];
        require(address(auction) != address(0), "Auction ID does not exist");
        //auction.endAuction{value:msg.value}(msg.sender);
        auction.endAuction(msg.sender);
        // // require(msg.sender == auction.auctionOwner(), "only the auction owner can close an auction");
        // // require(auction.auctionStatus() != AuctionStatus.Finished, "auction is already finished");
        // completeAuction(auction);
    }

    function placeBidPhysicalAuction(uint256 _auctionId) whenNotPaused isContractActive external payable {
        // PhysicalAuction auction = PhysicalAuction(physicalAuctions[_auctionId]);
        PhysicalAuction auction = physicalAuctions[_auctionId];
        require(address(auction) != address(0), "Auction ID does not exist");
        auction.placeBid{value:msg.value}(msg.sender, msg.value);
        //auction.placeBid(msg.sender, msg.value);
    }

    /*
    Place a bid on an auction
    Gas estimate: 149080
    */

    // function placeBid(uint256 _auctionId) whenNotPaused isContractActive external payable {
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

    // function completeAuction(PhysicalAuction auction) private {
    //    auction.close();
    //    require(auction.auctionStatus() == AuctionStatus.Finished, "Auction isn't finished yet");
    //    processPayouts(auction);
    // }



    function withdrawPayments(uint _auctionId, address payable payee) public nonReentrant isContractActive {
        PhysicalAuction auction = physicalAuctions[_auctionId];
        auction.withdrawPayments(payee);
    }


    // function processPayouts(Auction auction) private {
    //     bool isReserveMet = auction.reserveMet();
    //     AuctionBid[] memory auctionBids = auction.bids();
        
    //     //if theres no bids, theres nothing to payout
    //     if (auctionBids.length == 0){
    //         emit AuctionEndedWithNoWinningBid(auction.auctionId());
    //         return;
    //     }

    //     //if reserve isnt met, refund them all
    //     if (isReserveMet){

    //         AuctionBid memory lastBid = auctionBids[auctionBids.length - 1];

    //         //delete p the last bid off since we will process the final bid separately
    //         delete auctionBids[auctionBids.length-1];

    //         //Pay the Winner
    //         //use the last bid and move funds around
    //         lockedBalanceInBids[lastBid.bidder] -= (lastBid.bid);

    //         //move to available to withdraw
    //         super._asyncTransfer(auction.auctionOwner(), lastBid.bid);
    //         auctionsWonByUser[lastBid.bidder].push(auction.auctionId());
    //         emit AuctionEndedWithWinningBid(lastBid.bidder, auction.auctionId());
    //     }
    //     else{
    //         emit AuctionEndedWithNoWinningBid(auction.auctionId());
    //     }

    //     //refund all the bidders that needed to be refunded
    //     //if reserve was met it won't refund the last bid as that's already been transferred
    //     //to the auctionOwner above
    //     for (uint8 i = 0; i < auctionBids.length; i++){
    //         AuctionBid memory currentBid = auctionBids[i];

    //         //if you delete an item in memory, it zeros it out, the length is still the same
    //         //if its a zero address dont bother
    //         if (currentBid.bidder == address(0)){
    //             continue;
    //         }

    //         //send value from locked balance for address -> available balance. This can be withdrawn by a user.
    //         //we need proper exception handling here for if there isn't enough in locked balance. shouldnt ever be the case
    //         lockedBalanceInBids[currentBid.bidder] -= currentBid.bid;

    //         super._asyncTransfer(currentBid.bidder, currentBid.bid);

    //         emit AuctionBidRefunded(currentBid.bidder, auction.auctionId());
    //         emit AvailableBalanceUpdated(currentBid.bidder, currentBid.bid, super.payments(currentBid.bidder));
    //     }
    // }

    //If someone sends ether directly to contract, then store it in escrow and allow them to withdraw it
    // receive() external payable{
    //     require(msg.value > 0, "Call needs to send ether");
    //     super._asyncTransfer(msg.sender, msg.value);
    //     emit ContractValueReceived(msg.sender, msg.value);
    // }
}
