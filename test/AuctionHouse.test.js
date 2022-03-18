const { assert } = require('chai');
const {
    BN, 
    constants, 
    expectEvent,  // Assertions for emitted events
    expectRevert,
  } = require('.././node_modules/@openzeppelin/test-helpers');

const AuctionHouse = artifacts.require("AuctionHouse");

contract("AuctionHouse", async (accounts) => {
    beforeEach(async () => {
        this.ah = await AuctionHouse.new();
    });

    it("revert when start price is less than reserve price", async () => {
        await expectRevert.unspecified(
            this.ah.createPhysicalAuction(256, 300, "0x543645645", {from: accounts[0]})
        );

        //assert no auctions were created
        var numberOfAuctions = await this.ah.numberOfAuctions();
        assert.equal(numberOfAuctions, 0);
    });

    it("can successfully create auction", async () => {
        let response = await this.ah.createPhysicalAuction(256, 100, "0x543645645", {from: accounts[0]})

        //check receipt to make sure every was called
        expectEvent(response, 'AuctionCreated');

        //assert one auctions was created
        var numberOfAuctions = await this.ah.numberOfAuctions();
        assert.equal(numberOfAuctions, 1);
    });

    it("auction owner cant bid on his own auction", async () => {
        var createAuction = await this.ah.createPhysicalAuction(256, 250, "0x543645645", {from: accounts[0]});
        
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
        // await expectRevert.unspecified(
        //     this.ah.createPhysicalAuction(256, 300, "0x543645645", {from: accounts[0]})
        // );
    });

    it("make a bid less than the current high bid and revert", async () => {
        // await expectRevert.unspecified(
        //     this.ah.createPhysicalAuction(256, 300, "0x543645645", {from: accounts[0]})
        // );
    });

    it("can make bid on auction with bids already", async () => {
        // await expectRevert.unspecified(
        //     this.ah.createPhysicalAuction(256, 300, "0x543645645", {from: accounts[0]})
        // );
    });

    it("when an address makes a bid on auction theyve already bidded on - locked balance should be the sum", async () => {
        // await expectRevert.unspecified(
        //     this.ah.createPhysicalAuction(256, 300, "0x543645645", {from: accounts[0]})
        // );
    });


});

/* place bid tests
*
*
*
*
*
*
*/

