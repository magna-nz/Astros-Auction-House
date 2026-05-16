const { assert } = require('chai');
const truffleAssert = require('truffle-assertions');
const {
    expectRevert,
} = require('@openzeppelin/test-helpers');

const AuctionHouse = artifacts.require("AuctionHouse");

contract("AuctionHouse", async (accounts) => {
    beforeEach(async () => {
        this.ah = await AuctionHouse.new({ from: accounts[0] });
    });

    it("revert when start price is not less than reserve price", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        await truffleAssert.reverts(
            this.ah.createPhysicalAuction(256, 300, "0x543645645", futureTime, { from: accounts[0] }),
            "Start price must be less than reserve price"
        );
    });

    it("revert when end time is in the past", async () => {
        const pastTime = Math.floor(Date.now() / 1000) - 1000;
        await truffleAssert.reverts(
            this.ah.createPhysicalAuction(256, 100, "0x543645645", pastTime, { from: accounts[0] }),
            "End time must be in the future"
        );
    });

    it("can successfully create auction", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;

        const tx = await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        truffleAssert.eventEmitted(tx, "AuctionCreated", (ev) => {
            return ev.auctionOwner === accounts[0] &&
                ev.auctionId.toNumber() === 1 &&
                ev.startPrice.toNumber() === startPrice &&
                ev.reservePrice.toNumber() === reservePrice;
        });

        const auction = await this.ah.getAuction(1);
        assert.equal(auction.owner, accounts[0]);
        assert.equal(auction.startPrice, startPrice);
        assert.equal(auction.reservePrice, reservePrice);
        assert.equal(auction.status, 0); // Open
    });

    it("auction owner cannot bid on their own auction", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;
        const bidValue = web3.utils.toWei("1", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await expectRevert(
            this.ah.placeBid(1, { from: accounts[0], value: bidValue }),
            "Cannot bid on your own auction"
        );
    });

    it("can place bid on auction with no bids", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;
        const bidValue = web3.utils.toWei("1", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        const tx = await this.ah.placeBid(1, { from: accounts[1], value: bidValue });

        truffleAssert.eventEmitted(tx, "BidPlaced", (ev) => {
            return ev.bidder === accounts[1] &&
                ev.auctionId.toNumber() === 1 &&
                ev.amount.toString() === bidValue;
        });

        // Active bid is not in escrow yet, only in currentHighestBid
        const currentBid = await this.ah.getCurrentHighestBid(1);
        assert.equal(currentBid.amount.toString(), bidValue);
    });

    it("cannot place bid lower than current high bid", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const firstBid = web3.utils.toWei("2", "ether");
        const secondBid = web3.utils.toWei("1", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });

        // Will fail on 5% increment check since 1 ETH < 2.1 ETH (required)
        await expectRevert(
            this.ah.placeBid(1, { from: accounts[2], value: secondBid }),
            "Bid must be at least 5% higher than current bid"
        );
    });

    it("enforces minimum 5% bid increment", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const firstBid = web3.utils.toWei("2", "ether");
        const insufficientSecondBid = web3.utils.toWei("2.01", "ether"); // Only 0.5% increase

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });

        await expectRevert(
            this.ah.placeBid(1, { from: accounts[2], value: insufficientSecondBid }),
            "Bid must be at least 5% higher than current bid"
        );
    });

    it("accepts valid 5% higher bid and refunds previous bidder", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const firstBid = web3.utils.toWei("2", "ether");
        const secondBid = web3.utils.toWei("2.1", "ether"); // 5% increase

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });

        const tx = await this.ah.placeBid(1, { from: accounts[2], value: secondBid });

        truffleAssert.eventEmitted(tx, "BidRefunded", (ev) => {
            return ev.bidder === accounts[1] &&
                ev.amount.toString() === firstBid;
        });

        // Previous bidder's refund is in escrow
        const depositsAcc1 = await this.ah.depositsOf(accounts[1]);
        assert.equal(depositsAcc1.toString(), firstBid);

        // Current highest bidder's bid is NOT in escrow yet (only if refunded or auction ends)
        const depositsAcc2 = await this.ah.depositsOf(accounts[2]);
        assert.equal(depositsAcc2.toString(), "0");

        // But we can verify they have the active bid
        const currentBid = await this.ah.getCurrentHighestBid(1);
        assert.equal(currentBid.bidder, accounts[2]);
        assert.equal(currentBid.amount.toString(), secondBid);
    });

    it("can make multiple bids on auction", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const firstBid = web3.utils.toWei("2", "ether");
        const secondBid = web3.utils.toWei("2.1", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });
        await this.ah.placeBid(1, { from: accounts[2], value: secondBid });

        // accounts[1] has their refund in escrow
        const depositsAcc1 = await this.ah.depositsOf(accounts[1]);
        assert.equal(depositsAcc1.toString(), firstBid);

        // accounts[2] has the active bid (not in escrow yet)
        const depositsAcc2 = await this.ah.depositsOf(accounts[2]);
        assert.equal(depositsAcc2.toString(), "0");

        // Verify accounts[2] is the current highest bidder
        const currentBid = await this.ah.getCurrentHighestBid(1);
        assert.equal(currentBid.bidder, accounts[2]);
        assert.equal(currentBid.amount.toString(), secondBid);
    });

    it("cannot end non-existent auction", async () => {
        await expectRevert(
            this.ah.endAuction(999, { from: accounts[0] }),
            "Invalid auction ID"
        );
    });

    it("only auction owner can end auction", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;
        const bidValue = web3.utils.toWei("1", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: bidValue });

        await expectRevert(
            this.ah.endAuction(1, { from: accounts[1] }),
            "Only auction owner can end"
        );
    });

    it("can end auction with no bids", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        const tx = await this.ah.endAuction(1, { from: accounts[0] });

        truffleAssert.eventEmitted(tx, "AuctionFinalizedNoBids", (ev) => {
            return ev.auctionId.toNumber() === 1;
        });

        const auction = await this.ah.getAuction(1);
        assert.equal(auction.status, 1); // Finished
    });

    it("refunds all bids when reserve not met", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("5", "ether");
        const firstBid = web3.utils.toWei("2", "ether");
        const secondBid = web3.utils.toWei("3", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });
        await this.ah.placeBid(1, { from: accounts[2], value: secondBid });

        await this.ah.endAuction(1, { from: accounts[0] });

        // Both bids should be refunded since reserve not met
        const depositsAcc1 = await this.ah.depositsOf(accounts[1]);
        const depositsAcc2 = await this.ah.depositsOf(accounts[2]);

        assert.equal(depositsAcc1.toString(), firstBid);  // accounts[1] refunded
        assert.equal(depositsAcc2.toString(), secondBid); // accounts[2] refunded (was active)
    });

    it("credits seller when reserve is met", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const firstBid = web3.utils.toWei("2.5", "ether");
        const secondBid = web3.utils.toWei("3", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });
        await this.ah.placeBid(1, { from: accounts[2], value: secondBid });

        const tx = await this.ah.endAuction(1, { from: accounts[0] });

        truffleAssert.eventEmitted(tx, "AuctionFinalized", (ev) => {
            return ev.winner === accounts[2] &&
                ev.seller === accounts[0] &&
                ev.finalAmount.toString() === secondBid;
        });

        // Seller gets the winning bid
        const depositsOwner = await this.ah.depositsOf(accounts[0]);
        assert.equal(depositsOwner.toString(), secondBid);

        // Bidder 1 has their refund
        const depositsBidder1 = await this.ah.depositsOf(accounts[1]);
        assert.equal(depositsBidder1.toString(), firstBid);

        // Bidder 2 (winner) has no balance in escrow (their bid went to seller)
        const depositsBidder2 = await this.ah.depositsOf(accounts[2]);
        assert.equal(depositsBidder2.toString(), "0");
    });

    it("allows withdrawal of available funds", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const firstBid = web3.utils.toWei("2.5", "ether");
        const secondBid = web3.utils.toWei("3", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: firstBid });
        await this.ah.placeBid(1, { from: accounts[2], value: secondBid });
        await this.ah.endAuction(1, { from: accounts[0] });

        const balanceBefore = await web3.eth.getBalance(accounts[0]);
        await this.ah.withdrawPayments(accounts[0], { from: accounts[0] });
        const balanceAfter = await web3.eth.getBalance(accounts[0]);

        assert(web3.utils.toBN(balanceAfter).gt(web3.utils.toBN(balanceBefore)));

        const deposits = await this.ah.depositsOf(accounts[0]);
        assert.equal(deposits.toString(), "0");
    });

    it("prevents withdrawal twice", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("10", "ether");
        const bidValue = web3.utils.toWei("2", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        // Bid that doesn't meet reserve, so it will be refunded
        await this.ah.placeBid(1, { from: accounts[1], value: bidValue });
        await this.ah.endAuction(1, { from: accounts[0] });

        // First withdrawal should succeed
        await this.ah.withdrawPayments(accounts[1], { from: accounts[1] });

        // Second withdrawal should fail
        await expectRevert(
            this.ah.withdrawPayments(accounts[1], { from: accounts[1] }),
            "No funds to withdraw"
        );
    });

    it("pause contract prevents new auctions and bids", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;
        const bidValue = web3.utils.toWei("1", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.pauseContract({ from: accounts[0] });

        await expectRevert(
            this.ah.createPhysicalAuction(
                reservePrice,
                startPrice,
                "0x543645645",
                futureTime,
                { from: accounts[0] }
            ),
            "Pausable: paused"
        );

        await expectRevert(
            this.ah.placeBid(1, { from: accounts[1], value: bidValue }),
            "Pausable: paused"
        );
    });

    it("can still end auction and withdraw when paused", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const bidValue = web3.utils.toWei("3", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.placeBid(1, { from: accounts[1], value: bidValue });
        await this.ah.pauseContract({ from: accounts[0] });

        // Should still be able to end and withdraw
        await this.ah.endAuction(1, { from: accounts[0] });
        await this.ah.withdrawPayments(accounts[0], { from: accounts[0] });

        const deposits = await this.ah.depositsOf(accounts[0]);
        assert.equal(deposits.toString(), "0");
    });

    it("cannot bid after auction expires", async () => {
        // Create auction that expires in 3 seconds
        const futureTime = Math.floor(Date.now() / 1000) + 3;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");
        const bidValue = web3.utils.toWei("3", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        // Wait for auction to expire
        await new Promise(resolve => setTimeout(resolve, 4000));

        await expectRevert(
            this.ah.placeBid(1, { from: accounts[1], value: bidValue }),
            "Auction has ended"
        );
    });

    it("cannot end auction twice", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        await this.ah.endAuction(1, { from: accounts[0] });

        await expectRevert(
            this.ah.endAuction(1, { from: accounts[0] }),
            "Auction already finished"
        );
    });

    it("getAuction returns full auction data", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        const auction = await this.ah.getAuction(1);

        assert.equal(auction.owner, accounts[0]);
        assert.equal(auction.startPrice.toString(), startPrice);
        assert.equal(auction.reservePrice.toString(), reservePrice);
        assert.equal(auction.status, 0); // Open
        assert.equal(auction.reserveMet, false);
    });

    it("isAuctionActive returns correct status", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("2", "ether");

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        const isActive = await this.ah.isAuctionActive(1);
        assert.equal(isActive, true);

        await this.ah.endAuction(1, { from: accounts[0] });

        const isActiveAfter = await this.ah.isAuctionActive(1);
        assert.equal(isActiveAfter, false);
    });

    it("non-owner cannot pause contract", async () => {
        await expectRevert(
            this.ah.pauseContract({ from: accounts[1] }),
            "Ownable: caller is not the owner"
        );
    });

    it("getTotalAuctions returns correct count", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = 100;
        const reservePrice = 256;

        assert.equal((await this.ah.getTotalAuctions()).toNumber(), 0);

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        assert.equal((await this.ah.getTotalAuctions()).toNumber(), 1);

        await this.ah.createPhysicalAuction(
            reservePrice,
            startPrice,
            "0x543645645",
            futureTime,
            { from: accounts[0] }
        );

        assert.equal((await this.ah.getTotalAuctions()).toNumber(), 2);
    });
});

contract("AuctionHouse - Multi-auction", async (accounts) => {
    beforeEach(async () => {
        this.ah = await AuctionHouse.new({ from: accounts[0] });
    });

    it("accumulates refunds across multiple auctions", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("5", "ether");

        // Create two auctions
        await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x11111111", futureTime, { from: accounts[0] });
        await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x22222222", futureTime, { from: accounts[0] });

        // accounts[1] bids on auction 1, gets outbid
        await this.ah.placeBid(1, { from: accounts[1], value: web3.utils.toWei("2", "ether") });
        await this.ah.placeBid(1, { from: accounts[2], value: web3.utils.toWei("2.1", "ether") });

        // accounts[1] should have 2 ETH refund
        const afterFirst = await this.ah.depositsOf(accounts[1]);
        assert.equal(afterFirst.toString(), web3.utils.toWei("2", "ether"));

        // accounts[1] bids on auction 2, gets outbid
        await this.ah.placeBid(2, { from: accounts[1], value: web3.utils.toWei("3", "ether") });
        await this.ah.placeBid(2, { from: accounts[3], value: web3.utils.toWei("3.15", "ether") });

        // accounts[1] should have 2 + 3 = 5 ETH total refund (NOT just 3)
        const afterSecond = await this.ah.depositsOf(accounts[1]);
        assert.equal(afterSecond.toString(), web3.utils.toWei("5", "ether"));

        // Withdraw all
        await this.ah.withdrawPayments(accounts[1], { from: accounts[1] });
        const afterWithdraw = await this.ah.depositsOf(accounts[1]);
        assert.equal(afterWithdraw.toString(), "0");
    });

    it("same bidder can bid, get outbid, and bid again on same auction", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("5", "ether");

        await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x11111111", futureTime, { from: accounts[0] });

        // accounts[1] bids 2 ETH
        await this.ah.placeBid(1, { from: accounts[1], value: web3.utils.toWei("2", "ether") });

        // accounts[2] outbids with 2.1 ETH
        await this.ah.placeBid(1, { from: accounts[2], value: web3.utils.toWei("2.1", "ether") });

        // accounts[1] gets refund of 2 ETH
        const refund1 = await this.ah.depositsOf(accounts[1]);
        assert.equal(refund1.toString(), web3.utils.toWei("2", "ether"));

        // accounts[1] bids again with 2.21 ETH (5% over 2.1)
        await this.ah.placeBid(1, { from: accounts[1], value: web3.utils.toWei("2.21", "ether") });

        // accounts[1] is now highest bidder - their refund from before should still be there
        const currentBid = await this.ah.getCurrentHighestBid(1);
        assert.equal(currentBid.bidder, accounts[1]);

        // accounts[2] now has their refund
        const refund2 = await this.ah.depositsOf(accounts[2]);
        assert.equal(refund2.toString(), web3.utils.toWei("2.1", "ether"));

        // accounts[1] still has 2 ETH refund from earlier (from being outbid the first time)
        const acc1Deposits = await this.ah.depositsOf(accounts[1]);
        assert.equal(acc1Deposits.toString(), web3.utils.toWei("2", "ether"));
    });

    it("bidder can withdraw refund mid-auction and bid again", async () => {
        const futureTime = Math.floor(Date.now() / 1000) + 86400;
        const startPrice = web3.utils.toWei("1", "ether");
        const reservePrice = web3.utils.toWei("5", "ether");

        await this.ah.createPhysicalAuction(reservePrice, startPrice, "0x11111111", futureTime, { from: accounts[0] });

        // accounts[1] bids, gets outbid
        await this.ah.placeBid(1, { from: accounts[1], value: web3.utils.toWei("2", "ether") });
        await this.ah.placeBid(1, { from: accounts[2], value: web3.utils.toWei("2.1", "ether") });

        // accounts[1] withdraws their refund
        await this.ah.withdrawPayments(accounts[1], { from: accounts[1] });
        const afterWithdraw = await this.ah.depositsOf(accounts[1]);
        assert.equal(afterWithdraw.toString(), "0");

        // accounts[1] bids again
        await this.ah.placeBid(1, { from: accounts[1], value: web3.utils.toWei("2.21", "ether") });

        const currentBid = await this.ah.getCurrentHighestBid(1);
        assert.equal(currentBid.bidder, accounts[1]);
        assert.equal(currentBid.amount.toString(), web3.utils.toWei("2.21", "ether"));
    });
});
