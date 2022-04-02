const { assert } = require('chai');
const truffleAssert = require('truffle-assertions');
const debug = require('truffle-plugin-debugger');
const {
    expectRevert,
  } = require('.././node_modules/@openzeppelin/test-helpers');

const AuctionHouse = artifacts.require("AuctionHouse");
const Auction = artifacts.require("PhysicalAuction");

contract("AuctionHouse", async (accounts) => {
    beforeEach(async () => {
        this.ah = await AuctionHouse.new({from:accounts[0]});
        
    });

    it("revert when start price is less than reserve price", async () => {

        await truffleAssert.reverts(
            this.ah.createPhysicalAuction(256, 300, "0x543645645", 10420436704 ,{from: accounts[0]}), "Invalid start price"
        );
    });

    it("can successfully create auction", async () => {
        //arrange
        var contractAddress;
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });
                                
        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await auctionInstance.getBidCount(), 0);
        assert.equal(await auctionInstance.endTime(), endTime);
        assert.equal(await auctionInstance.auctionStatus(), '0');
        assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[1]), 0);
    });

    it("auction owner cant bid on his own auction", async () => {
        //arrange
        var contractAddress;
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        var firstBidValue = 10000000;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

        //try place bid
        await truffleAssert.reverts(
            this.ah.placeBidPhysicalAuction(1,  {from: accounts[0], value: firstBidValue}), "You can't bid on your own auction"
        );

        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await auctionInstance.getBidCount(), 0);
        assert.equal(await auctionInstance.endTime(), endTime);
        assert.equal(await auctionInstance.auctionStatus(), '0');
        assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[1]), 0);
    });

    it("can make bid on an auction with no bids", async () => {

        //arrange
        var contractAddress;
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        var firstBidValue = 10000000;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

        //place the bid
        //todo: check events emitted from child contracts.
        await this.ah.placeBidPhysicalAuction(1,  {from: accounts[1], value: firstBidValue});

        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await auctionInstance.getBidCount(), 1);
        assert.equal(await auctionInstance.endTime(), endTime);
        assert.equal(await auctionInstance.auctionStatus(), '0');
        assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[1]), firstBidValue);
    });

    it("make a bid less than the current high bid and revert", async () => {

        //arrange
        var contractAddress;
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        var firstBidValue = 10000000;
        var secondBidValueBelowCurrentBid = 00000001;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

        //place the bid
        //todo: check events emitted from child contracts.
        await this.ah.placeBidPhysicalAuction(1,  {from: accounts[1], value: firstBidValue});
        
        await expectRevert.unspecified(this.ah.placeBidPhysicalAuction(1,  {from: accounts[2], value: secondBidValueBelowCurrentBid})
        );

        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await auctionInstance.getBidCount(), 1);
        assert.equal(await auctionInstance.endTime(), endTime);
        assert.equal(await auctionInstance.auctionStatus(), '0');
        assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[1]), firstBidValue);
        assert.equal(await auctionInstance.depositsOf(accounts[2]), 0);
    });

    it("can make bid on auction with bids already", async () => {

        //arrange
        var contractAddress;
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        var firstBidValue = 10000000;
        var secondBidValue = 12000000;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

        //place the bid
        //todo: check events emitted from child contracts.
        await this.ah.placeBidPhysicalAuction(1,  {from: accounts[1], value: firstBidValue});
        await this.ah.placeBidPhysicalAuction(1,  {from: accounts[2], value: secondBidValue});

        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await auctionInstance.getBidCount(), 2);
        assert.equal(await auctionInstance.endTime(), endTime);
        assert.equal(await auctionInstance.auctionStatus(), '0');
        assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[1]), firstBidValue);
        assert.equal(await auctionInstance.depositsOf(accounts[2]), secondBidValue);
    });

    it("when two bids placed - locked balance in escrow should be the sum of the two", async () => {
        //arrange
        var contractAddress;
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        var firstBidValue = 10000000;
        var secondBidValue = 12000000;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

        //todo: check events emitted from child contracts.
        await this.ah.placeBidPhysicalAuction(1,  {from: accounts[1], value: firstBidValue});
        await this.ah.placeBidPhysicalAuction(1,  {from: accounts[2], value: secondBidValue});

        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await web3.eth.getBalance(auctionInstance.address), (firstBidValue + secondBidValue));
    });

    it("end auction with auction id that doesn't exist - revert", async () => {
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

        await expectRevert.unspecified(
            this.ah.endPhysicalAuction(4,  {from: accounts[0]})
        );
    });

    it("place auction (owner), bid (acc[1]), end (acc[1]) - revert because cant end someone elses auction", async () => {
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        var firstBidValue = 10000000;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });

       //act                        
       await this.ah.placeBidPhysicalAuction(1,  {from: accounts[1], value: firstBidValue});
       await expectRevert.unspecified(
            this.ah.endPhysicalAuction(1,  {from: accounts[1]})
       );

       //assert
       var auctionInstance = await Auction.at(contractAddress);
       assert.equal(await auctionInstance.getBidCount(), 1);
       assert.equal(await auctionInstance.endTime(), endTime);
       assert.equal(await auctionInstance.auctionStatus(), '0');
       assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
       assert.equal(await auctionInstance.depositsOf(accounts[1]), firstBidValue);
       assert.equal(await auctionInstance.depositsOf(accounts[2]), 0);
    });

    it("place auction (acc[0]), no bidders, end auction (acc[0]), txn successful, auction closed", async () => {
        var endTime = 10420436704;
        var startPrice = 100;
        var reservePrice = 256;
        //var firstBidValue = 10000000;
        //var secondBidValue = 12000000;

        //act
        truffleAssert.eventEmitted(
            await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x543645645", endTime, {from: accounts[0]}),
                "AuctionCreated", (ev) => {
                    contractAddress = ev._auctionContract;
                    return ev._endTime == endTime && ev._auctionOwner == accounts[0]
                            && ev._auctionId == 1 && ev._startPrice == startPrice
                            && ev._reservePrice == reservePrice;
                                });
        
        await this.ah.endPhysicalAuction(1,  {from: accounts[0]});

        //assert
        var auctionInstance = await Auction.at(contractAddress);
        assert.equal(await auctionInstance.getBidCount(), 0);
        assert.equal(await auctionInstance.endTime(), endTime);
        assert.equal(await auctionInstance.auctionStatus(), '1');
        assert.equal(await auctionInstance.depositsOf(accounts[0]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[1]), 0);
        assert.equal(await auctionInstance.depositsOf(accounts[2]), 0);
     });

    // it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], not meet reserve - refund all bidders", async () => {
    //     var firstBidderAmount = 10000000;
    //     var secondBidderAmount = 11000000;
    //     var reservePrice = 12000000;

    //     truffleAssert.eventEmitted(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]}),
    //                             "AuctionCreated");
        
    //     //place 2 bids
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}),
    //                             "AuctionBidSuccessful");
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}),
    //                             "AuctionBidSuccessful");

    //     //get balances/state beforehand
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), firstBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), secondBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    //     //end the auction with reserve not met
    //     truffleAssert.eventEmitted(await this.ah.endAuction(1, {from:accounts[0]}),
    //                             "AuctionEndedWithNoWinningBid");

    //     //reserve wasnt met so owner shouldnt haver anything to withdraw
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     //account 1 should be refunded and funds unlocked and available for withdrawal
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 0);
    //     assert.equal(await this.ah.payments(accounts[1]), firstBidderAmount);

    //     //account 2 should be refunded and funds unlocked and available for withdrawal
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);
    //     assert.equal(await this.ah.payments(accounts[2]), secondBidderAmount);
    // });

    // it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], meet reserve - refund all bidders except winner", async () => {
    //     var firstBidderAmount = 10000000;
    //     var secondBidderAmount = 13000000;
    //     var reservePrice = 12000000;

    //     truffleAssert.eventEmitted(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]}),
    //                             "AuctionCreated");
        
    //     //place 2 bids
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}),
    //                             "AuctionBidSuccessful");

    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}),
    //                             "AuctionBidSuccessful");


    //     //get balances/state beforehand
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), firstBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), secondBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    //     //end the auction with reserve not met
    //     truffleAssert.eventEmitted(await this.ah.endAuction(1, {from:accounts[0]}),
    //                             "AuctionEndedWithWinningBid");

    //     //reserve was met so owner should have the latest bid available to withdraw
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), secondBidderAmount);

    //     //account 1 should be refunded and funds unlocked and available for withdrawal
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 0);
    //     assert.equal(await this.ah.payments(accounts[1]), firstBidderAmount);

    //     //account 2 paid for the bid and have won, so their balance was transferred to winner
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);
    //     assert.equal(await this.ah.payments(accounts[2]), 0);
    // });

    // it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], reserve met, withdraw balance acc[0], withdraw balance acc[1]", async () => {
    //     var firstBidderAmount = "100000000000000000";
    //     var secondBidderAmount = "130000000000000000";
    //     var reservePrice = "120000000000000000";

    //     truffleAssert.eventEmitted(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]}),
    //                             "AuctionCreated");
        
    //     //place 2 bids
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}),
    //                             "AuctionBidSuccessful");
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}),
    //                             "AuctionBidSuccessful");


    //     //get balances/state beforehand
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), firstBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), secondBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    //     //end the auction with reserve not met
    //     truffleAssert.eventEmitted(await this.ah.endAuction(1, {from:accounts[0]}),
    //                             "AuctionEndedWithWinningBid");

    //     //reserve was met so owner should have the latest bid available to withdraw
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), secondBidderAmount);

    //     //account 1 should be refunded and funds unlocked and available for withdrawal
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 0);
    //     assert.equal(await this.ah.payments(accounts[1]), firstBidderAmount);

    //     //account 2 paid for the bid and have won, so their balance was transferred to winner
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    //     //at this point
    //     // - acc[0] has acc[2]'s winning bid
    //     // - acc[1] has its own bid back
    //     // - acc[2] has no balance as asserted above
    //     await this.ah.withdrawPayments(accounts[0], {from: accounts[0]});
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     await this.ah.withdrawPayments(accounts[1], {from: accounts[1]});
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     //todo: improvement - check the account new balance is ( (prevBalance + withdrawAmount) - gasfee))

    // });

    // it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], reserve not met, withdraw balance acc[0], withdraw balance acc[1]", async () => {
    //     var firstBidderAmount = "100000000000000000";
    //     var secondBidderAmount = "130000000000000000";
    //     var reservePrice = "150000000000000000";

    //     truffleAssert.eventEmitted(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]}),
    //                             "AuctionCreated");
        
    //     //place 2 bids
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}),
    //                             "AuctionBidSuccessful");

    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}),
    //                             "AuctionBidSuccessful");


    //     //get balances/state beforehand
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), firstBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), secondBidderAmount);
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    //     //end the auction with reserve not met
    //     truffleAssert.eventEmitted(await this.ah.endAuction(1, {from:accounts[0]}),
    //                             "AuctionEndedWithNoWinningBid");

    //     //reserve was not met so owner, and they didn't bid, so nothing should be available
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    //     assert.equal(await this.ah.payments(accounts[0]), 0);

    //     //account 1 should be refunded and funds unlocked and available for withdrawal
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 0);
    //     assert.equal(await this.ah.payments(accounts[1]), firstBidderAmount);

    //     //account 2 should be refunded and funds unlocked and available for withdrawal
    //     assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);
    //     assert.equal(await this.ah.payments(accounts[2]), secondBidderAmount);

    //     //at this point
    //     // - acc[0] has nothing to withdraw
    //     // - acc[1] has its own bid back
    //     // - acc[2] has its own bid back
    //     await this.ah.withdrawPayments(accounts[1], {from: accounts[1]});
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     await this.ah.withdrawPayments(accounts[2], {from: accounts[2]});
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    //     //todo: improvement - check the account new balance is ( (prevBalance + withdrawAmount) - gasfee))
    // });

    // it("pause contract as not owner, revert should happen", async () => {//Ownable: caller is not the owner
    //     await truffleAssert.reverts(
    //         this.ah.pauseContract({from: accounts[1]}), "Ownable: caller is not the owner"
    //     );
    // });

    // it("pause contract as owner, check if paused, should be true", async () => {
    //     truffleAssert.eventEmitted(await this.ah.pauseContract({from: accounts[0]}),
    //                             "Paused");

    //     assert.equal(await this.ah.paused(), true);
    // });

    // it("pause contract as owner, try place auction, revert", async () => {
    //     truffleAssert.eventEmitted(await this.ah.pauseContract({from: accounts[0]}),
    //                             "Paused");

    //     await truffleAssert.reverts(
    //         this.ah.placeBid(1,  {from: accounts[0], value:10000000}), "Pausable: paused"
    //     );

    //     //assert no auctions were created
    //     assert.equal(await this.ah.numberOfAuctions(), 0);
    // });

    // it("place auction, pause as owner, try place bid, revert", async () => {
    //     var firstBidderAmount = "100000000000000000";
    //     var reservePrice = "150000000000000000";

    //     truffleAssert.eventEmitted(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]}),
    //                             "AuctionCreated");

    //     truffleAssert.eventEmitted(await this.ah.pauseContract({from: accounts[0]}),
    //                             "Paused");

    //     await truffleAssert.reverts(
    //         this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}), "Pausable: paused"
    //     );


    // });

    // it("place auction, place bid, pause contract, auction owner can still end and bidders can still withdraw", async () => {
    //     var firstBidderAmount = "100000000000000000";
    //     var secondBidderAmount = "130000000000000000";
    //     var reservePrice = "150000000000000000";

    //     truffleAssert.eventEmitted(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]}),
    //                             "AuctionCreated");

    //     //place 2 bids
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}),
    //                             "AuctionBidSuccessful");
    //     truffleAssert.eventEmitted(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}),
    //                             "AuctionBidSuccessful");

    //     //Pause
    //     truffleAssert.eventEmitted(await this.ah.pauseContract({from: accounts[0]}),
    //                             "Paused");

    //     //end the auction, should still be possible
    //     truffleAssert.eventEmitted(await this.ah.endAuction(1, {from:accounts[0]}),
    //                             "AuctionEndedWithNoWinningBid");

    //     //at this point
    //     // - acc[0] has nothing to withdraw
    //     // - acc[1] has its own bid back
    //     // - acc[2] has its own bid back

    //     await this.ah.withdrawPayments(accounts[1], {from: accounts[1]});
    //     assert.equal(await this.ah.payments(accounts[1]), 0);

    //     await this.ah.withdrawPayments(accounts[2], {from: accounts[2]});
    //     assert.equal(await this.ah.payments(accounts[2]), 0);

    // });


    //Test fallback

});
