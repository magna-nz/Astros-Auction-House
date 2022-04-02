// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import "./Auction.sol";
import "./AuctionHouse.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";

contract PhysicalAuction is Auction{
    using SafeMath for uint;
    constructor(uint256 _reservePrice,
                uint256 _startPrice,
                address _auctionHouse,
                bytes16 _auctionName,
                uint256 _auctionId,
                uint256 _endTime,
                address _auctionOwner) 
    Auction(_reservePrice, _startPrice, _auctionHouse, _auctionName, _auctionId, _endTime, _auctionOwner){

    }

    function endAuction(address caller) isAuctionHouse external payable override {
        require(caller == this.auctionOwner(), "only the auction owner can close an auction");
        require(this.auctionStatus() != AuctionStatus.Finished, "Auction is already finished");
        super.close();
        require(this.auctionStatus() == AuctionStatus.Finished, "Auction isn't finished yet");
        processPayouts();
    }

    function processPayouts() private {
        AuctionBid[] memory auctionBids = super.getBids();
        
        //if theres no bids, theres nothing to payout
        if (auctionBids.length == 0){
            emit AuctionEndedWithNoWinningBid(this.auctionId());
            return;
        }

        //if reserve isnt met, refund them all
        if (this.reserveMet()){

            AuctionBid memory lastBid = auctionBids[auctionBids.length - 1];

            //delete p the last bid off since we will process the final bid separately
            delete auctionBids[auctionBids.length-1];

            //Pay the Winner
            //use the last bid and move funds around
            super.moveFundsBetween(lastBid.bidder, this.auctionOwner(), lastBid.bid);
            emit AuctionEndedWithWinningBid(lastBid.bidder, this.auctionId());
        }
        else{
            emit AuctionEndedWithNoWinningBid(this.auctionId());
        }

        //refund all the bidders that needed to be refunded
        //if reserve was met it won't refund the last bid as that's already been transferred
        //to the auctionOwner above
        for (uint8 i = 0; i < auctionBids.length; i++){
            AuctionBid memory currentBid = auctionBids[i];

            //if you delete an item in memory, it zeros it out, the length is still the same
            //if its a zero address dont bother
            if (currentBid.bidder == address(0)){
                continue;
            }
            
            emit AuctionBidRefunded(currentBid.bidder, this.auctionId());
            emit AvailableBalanceUpdated(currentBid.bidder, currentBid.bid, super.depositsOf(currentBid.bidder));
        }
    }

    function placeBid(address bidder, uint256 bidAmount) isAuctionHouse external payable override  {
        require(this.auctionOwner() != bidder, "You can't bid on your own auction");
        require(block.timestamp <= this.endTime(), "Auction has expired.");
        require(this.auctionStatus() != AuctionStatus.Finished, "You can't bid on an auction that's ended");
        require(bidAmount > this.startPrice(), "Auction must be greater than start price");

        //get the last bid and compare it if there's already a bid on it
        if (this.getBidCount() != 0){
            AuctionBid memory lastAuctionBid = this.getBidByIndex(this.getBidCount().sub(1));
            require(bidAmount > lastAuctionBid.bid, "bid not high enough");
        }
        
        //add the bid to the auction
        AuctionBid memory newAuctionBid = AuctionBid({
            bid: msg.value,
            bidder: bidder,
            timestamp: block.timestamp
        });

        super.placeBidOnAuction(newAuctionBid);
        super.updateIfReserveMet(bidAmount, bidder);
        super.deposit(newAuctionBid.bidder);

        emit AuctionBidSuccessful(bidder, this.auctionId(), bidAmount, this.reserveMet());
    }
}