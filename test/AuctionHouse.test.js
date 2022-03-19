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
        var numberOfAuctions = await this.ah.numberOfAuctions();
        assert.equal(numberOfAuctions, 0);
    });

    it("can successfully create auction", async () => {
        let response = await this.ah.createPhysicalAuction(256, 100, "0x543645645", 10420436704, {from: accounts[0]})

        //check receipt to make sure every was called
        expectEvent(response, 'AuctionCreated');

        //assert one auctions was created
        var numberOfAuctions = await this.ah.numberOfAuctions();
        assert.equal(numberOfAuctions, 1);
    });

    it("auction owner cant bid on his own auction", async () => {
        var createAuction = await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704, {from: accounts[0]});

        //try place bid
        await expectRevert.unspecified(
            this.ah.placeBid(1,  {from: accounts[0], value:10000000})
        );

        //make sure no bids have been added
        //todo: call the get bids by auction ID to check when that's implemented
        
        //no lockedbalance for user
        var lockedBalance = await this.ah.lockedBalanceInBids(accounts[0]);
        assert.equal(lockedBalance, 0);
    });

    it("can make bid on an auction with no bids", async () => {
        var createAuction = await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704, {from: accounts[0]});
        //todo: get the auctionid from the log event
        expectEvent(createAuction, 'AuctionCreated');

        //place the bid
        var bid = await this.ah.placeBid(1,  {from: accounts[1], value:10000000});
        expectEvent(bid, 'AuctionBidSuccessful');

        //checked lockedbalance
        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[1]);
        assert.equal(lockedBalanceForBidder, 10000000);

        var lockedBalanceForOwner = await this.ah.lockedBalanceInBids(accounts[0]);
        assert.equal(lockedBalanceForOwner, 0);

        //check bid length on auction contract, should be 1

        //check auctionsbidbyuser has one item in the array

    });

    it("make a bid less than the current high bid and revert", async () => {
        var createAuction = await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704, {from: accounts[0]});
        //todo: get the auctionid from the log event
        expectEvent(createAuction, 'AuctionCreated');

        //place the bid
        await this.ah.placeBid(1,  {from: accounts[1], value:10000000});
        await expectRevert.unspecified(this.ah.placeBid(1,  {from: accounts[2], value:00000011})
        );

        //no locked balance for new bidder because bid failed
        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[2]);
        assert.equal(lockedBalanceForBidder, 0);

        //locked balance for first bidder still correct
        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[1]);
        assert.equal(lockedBalanceForBidder, 10000000);

        //check bid length on auction contract, should be 0

        //check auctionsbidbyuser has 0 item in the array
    });

    it("can make bid on auction with bids already", async () => {
        var createAuction = await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704 ,{from: accounts[0]});
        //todo: get the auctionid from the log event
        expectEvent(createAuction, 'AuctionCreated');

        //place the bid
        var firstBid = await this.ah.placeBid(1,  {from: accounts[1], value:10000000});
        expectEvent(firstBid, 'AuctionBidSuccessful');

        var secondBid = await this.ah.placeBid(1,  {from: accounts[2], value:12000000});
        expectEvent(secondBid, 'AuctionBidSuccessful');


        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[1]);
        assert.equal(lockedBalanceForBidder, 10000000);

        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[2]);
        assert.equal(lockedBalanceForBidder, 12000000);

        //check bid length on auction contract, should be 2

        //check auctionsbidbyuser has 2 item in the array
    });

    it("when an address makes a bid on auction theyve already bidded on - locked balance should be the sum", async () => {
        var createAuction = await this.ah.createPhysicalAuction(256, 250, "0x543645645", 10420436704 ,{from: accounts[0]});
        //todo: get the auctionid from the log event
        expectEvent(createAuction, 'AuctionCreated');

        var firstBidInWei = 10000000;
        var secondBidInWei = 12000000;

        //place the bid
        var firstBid = await this.ah.placeBid(1,  {from: accounts[1], value: firstBidInWei});
        expectEvent(firstBid, 'AuctionBidSuccessful');

        var secondBid = await this.ah.placeBid(1,  {from: accounts[1], value:secondBidInWei});
        expectEvent(secondBid, 'AuctionBidSuccessful');


        //sum of
        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[1]);
        assert.equal(lockedBalanceForBidder, (firstBidInWei+secondBidInWei));

        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[2]);
        assert.equal(lockedBalanceForBidder, 0);

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
        var ins = await AuctionHouse.deployed();
        await ins.createPhysicalAuction(100,50, "0x33333", 10420436704, {from: accounts[0]});
        expectEvent(createAuction, 'AuctionCreated');

        var end = await ins.endAuction(1, {from:accounts[0]});
        expectEvent(end, 'AuctionEndedWithNoWinningBid');


        var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[0]);
        assert.equal(lockedBalanceForBidder, 0);

        //somehow get contract instance and check here if auction has ended

     });

    it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], not meet reserve - refund all bidders", async () => {
        var ins = await AuctionHouse.deployed();
        await ins.createPhysicalAuction(100,50, "0x33333", 10420436704, {from: accounts[0]});
        expectEvent(createAuction, 'AuctionCreated');
    });

    it("place auction acc[0], bid acc[1], bid acc[2], end acc[0], meet reserve - refund all bidders except winner, payout auctionOwner", async () => {
        
    });

    it("place auction acc[0], bid acc[1], end acc[0], try end again acc[0] - revert auction finished,", async () => {
        
    });


});
