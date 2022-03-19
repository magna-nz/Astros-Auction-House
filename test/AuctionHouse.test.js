const { assert } = require('chai');
const {
    BN, 
    constants, 
    expectEvent, 
    expectRevert,
  } = require('.././node_modules/@openzeppelin/test-helpers');

const AuctionHouse = artifacts.require("AuctionHouse");

contract("AuctionHouse", async (accounts) => {
    beforeEach(async () => {
        this.ah = await AuctionHouse.new();
        
    });

    it("revert when start price is less than reserve price", async () => {
        await expectRevert.unspecified(
            this.ah.createPhysicalAuction(256, 300, "0x543645645", 10420436704 ,{from: accounts[0]})
        );

        //assert no auctions were created
        assert.equal(await this.ah.numberOfAuctions(), 0);
    });

    it("can successfully create auction", async () => {

        //check receipt to make sure every was called
        expectEvent(await this.ah.createPhysicalAuction(256, 100, "0x543645645", 10420436704, {from: accounts[0]})
        , 'AuctionCreated');

        //assert one auctions was created
        assert.equal(await this.ah.numberOfAuctions(), 1);
    });

    it("auction owner cant bid on his own auction", async () => {
        expectEvent(await this.ah.createPhysicalAuction(256, 100, "0x543645645", 10420436704, {from: accounts[0]})
        , 'AuctionCreated');

        //try place bid
        await expectRevert.unspecified(
            this.ah.placeBid(1,  {from: accounts[0], value:10000000})
        );

        //make sure no bids have been added
        //todo: call the get bids by auction ID to check when that's implemented
        
        //no lockedbalance for user
        assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
    });

    it("can make bid on an auction with no bids", async () => {

        //todo: get the auctionid from the log event
        expectEvent(await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704, {from: accounts[0]})
            , 'AuctionCreated');

        //place the bid
        expectEvent(await this.ah.placeBid(1,  {from: accounts[1], value:10000000}), 'AuctionBidSuccessful');

        //checked lockedbalance
        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[1]);
        assert.equal(lockedBalanceForBidder, 10000000);

        var lockedBalanceForOwner = await this.ah.lockedBalanceInBids(accounts[0]);
        assert.equal(lockedBalanceForOwner, 0);

        //check bid length on auction contract, should be 1

        //check auctionsbidbyuser has one item in the array

    });

    it("make a bid less than the current high bid and revert", async () => {

        //todo: get the auctionid from the log event
        expectEvent(await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704, {from: accounts[0]}), 'AuctionCreated');

        //place the bid
        await this.ah.placeBid(1,  {from: accounts[1], value:10000000});
        await expectRevert.unspecified(this.ah.placeBid(1,  {from: accounts[2], value:00000011})
        );

        //no locked balance for new bidder because bid failed
        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);

        //locked balance for first bidder still correct
        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 10000000);

        //check bid length on auction contract, should be 0

        //check auctionsbidbyuser has 0 item in the array
    });

    it("can make bid on auction with bids already", async () => {
        //todo: get the auctionid from the log event
        expectEvent(await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704 ,{from: accounts[0]}), 'AuctionCreated');

        //place the bid
        expectEvent(await this.ah.placeBid(1,  {from: accounts[1], value:10000000}), 'AuctionBidSuccessful');

        expectEvent(await this.ah.placeBid(1,  {from: accounts[2], value:12000000}), 'AuctionBidSuccessful');


        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 10000000);

        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 12000000);

        //check bid length on auction contract, should be 2

        //check auctionsbidbyuser has 2 item in the array
    });

    it("when an address makes a bid on auction theyve already bidded on - locked balance should be the sum", async () => {
        //todo: get the auctionid from the log event
        expectEvent(await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704 ,{from: accounts[0]})
            , 'AuctionCreated');

        var firstBidInWei = 10000000;
        var secondBidInWei = 12000000;

        //place the bid
        expectEvent(await this.ah.placeBid(1,  {from: accounts[1], value: firstBidInWei}),
            'AuctionBidSuccessful');

        expectEvent(await this.ah.placeBid(1,  {from: accounts[1], value:secondBidInWei})
            , 'AuctionBidSuccessful');


        //sum of
        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), (firstBidInWei+secondBidInWei));

        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);

        //check bid length on auction contract, should be 2

        //check auctionsbidbyuser has 2 item in the array
    });

    it("end auction with auction id that doesn't exist - revert", async () => {
        //auctionId 1 is created
        await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704 ,{from: accounts[0]});
        await expectRevert.unspecified(
            this.ah.endAuction(4,  {from: accounts[0]})
        );
    });

    it("place auction acc[0], bid acc[1], end acc[1] - revert", async () => {
       //auctionId 1 is created
       await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704 ,{from: accounts[0]});

       await expectRevert.unspecified(
           this.ah.endAuction(1,  {from: accounts[1]})
       );
    });

    it("place auction acc[0], no bidders, end acc[0], txn successful, auction closed", async () => {

        expectEvent(await this.ah.createPhysicalAuction(100,50, "0x33333", 10420436704, {from: accounts[0]})
        , 'AuctionCreated');

        expectEvent(await this.ah.endAuction(1, {from:accounts[0]}), 'AuctionEndedWithNoWinningBid');


        assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);

        //somehow get contract instance and check here if auction has ended

     });

    it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], not meet reserve - refund all bidders", async () => {
        var firstBidderAmount = 10000000;
        var secondBidderAmount = 11000000;
        var reservePrice = 12000000;

        expectEvent(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]})
                , 'AuctionCreated');
        
        //place 2 bids
        expectEvent(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}), 'AuctionBidSuccessful');
        expectEvent(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}), 'AuctionBidSuccessful');


        //get balances/state beforehand
        assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[0]), 0);

        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), firstBidderAmount);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[1]), 0);

        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), secondBidderAmount);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[2]), 0);

        //end the auction with reserve not met
        expectEvent(await this.ah.endAuction(1, {from:accounts[0]}), 'AuctionEndedWithNoWinningBid');

        //reserve wasnt met so owner shouldnt haver anything to withdraw
        assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[0]), 0);

        //account 1 should be refunded and funds unlocked and available for withdrawal
        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[1]), firstBidderAmount);

        //account 2 should be refunded and funds unlocked and available for withdrawal
        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[2]), secondBidderAmount);
    });

    it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], meet reserve - refund all bidders except winner, payout auctionOwner", async () => {
        var firstBidderAmount = 10000000;
        var secondBidderAmount = 13000000;
        var reservePrice = 12000000;

        expectEvent(await this.ah.createPhysicalAuction(reservePrice, 50, "0x33333", 10420436704, {from: accounts[0]})
                , 'AuctionCreated');
        
        //place 2 bids
        expectEvent(await this.ah.placeBid(1, {from:accounts[1], value: firstBidderAmount}), 'AuctionBidSuccessful');
        expectEvent(await this.ah.placeBid(1, {from:accounts[2], value: secondBidderAmount}), 'AuctionBidSuccessful');


        //get balances/state beforehand
        assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[0]), 0);

        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), firstBidderAmount);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[1]), 0);

        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), secondBidderAmount);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[2]), 0);

        //end the auction with reserve not met
        expectEvent(await this.ah.endAuction(1, {from:accounts[0]}), 'AuctionEndedWithWinningBid');

        //reserve was met so owner should have the latest bid available to withdraw
        assert.equal(await this.ah.lockedBalanceInBids(accounts[0]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[0]), secondBidderAmount);

        //account 1 should be refunded and funds unlocked and available for withdrawal
        assert.equal(await this.ah.lockedBalanceInBids(accounts[1]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[1]), firstBidderAmount);

        //account 2 paid for the bid and have won, so their balance was transferred to winner
        assert.equal(await this.ah.lockedBalanceInBids(accounts[2]), 0);
        assert.equal(await this.ah.availableBalanceToWithdraw(accounts[2]), 0);
    });

    it("place auction acc[0], bid acc[1], end acc[0], try end again acc[0] - revert auction finished,", async () => {
        
    });


});
