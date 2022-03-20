var ins = await AuctionHouse.deployed();

//create auction
var txn = await ins.createPhysicalAuction(100,50,"0x33333", 10420436704, {from: accounts[0]});

//place bid
var bid1 = await ins.placeBid(1, {from:accounts[1], value:10000000});
var bid2 = await ins.placeBid(1, {from:accounts[2], value:11000000});

var end = await ins.endAuction(1, {from:accounts[0]});

//after auction ends
var lockedBalanceForBidder = await this.ah.lockedBalanceInBids(accounts[0]);
var avail1 = await ins.availableBalanceToWithdraw(accounts[2]);

//gas estimation:
var txn = await ins.createPhysicalAuction.estimateGas(100,50,"0x000", 1010420436704);