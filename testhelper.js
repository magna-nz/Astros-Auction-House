var ins = await AuctionHouse.deployed();

//create auction
var txn = await ins.createPhysicalAuction(100,50,"0x33333", 10420436704, {from: accounts[0]});

//place bid
var bid1 = await ins.placeBid(1, {from:accounts[1], value:10000000});
var bid2 = await ins.placeBid(1, {from:accounts[1], value:11000000});

var end = await ins.endAuction(1, {from:accounts[0]});