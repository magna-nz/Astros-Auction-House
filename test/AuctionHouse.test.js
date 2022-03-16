//sending startprice > reserve price error
//createPhysicalAuction

const { assert } = require('chai');
const {
    BN,           // Big Number support
    constants,    // Common constants, like the zero address and largest integers
    expectEvent,  // Assertions for emitted events
    expectRevert, // Assertions for transactions that should fail
  } = require('.././node_modules/@openzeppelin/test-helpers');

const AuctionHouse = artifacts.require("AuctionHouse");

contract("AuctionHouse", async (accounts) => {
    beforeEach(async () => {
        this.ah = await AuctionHouse.new();
    });

    it("when start price is less than reserve price, revert", async () => {
        await expectRevert.unspecified(
            this.ah.createPhysicalAuction(256, 300, "0x543645645", {from: accounts[0]})
        );

        //assert no auctions were created
        var numberOfAuctions = await this.ah.numberOfAuctions();
        assert.equal(numberOfAuctions, 0);
    });

    
});

