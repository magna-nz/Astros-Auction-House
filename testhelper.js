var ins = await AuctionHouse.deployed();

//create auction
var txn = await ins.createPhysicalAuction(100,50,"0x33333", 10420436704, {from: accounts[0]});

//place bid
var bid1 = await ins.placeBidPhysicalAuction(1, {from:accounts[1], value:100000000000000000});
var bid2 = await ins.placeBidPhysicalAuction(1, {from:accounts[2], value:110000000000000000});
// var bid1 = await ins.placeBid(1, {from:accounts[1], value:100000000000000000});
// var bid2 = await ins.placeBid(1, {from:accounts[2], value:110000000000000000});

var end = await ins.endPhysicalAuction(1, {from:accounts[0]});
//var end = await ins.endAuction(1, {from:accounts[0], value:10000000});

//check available balance
var withdrawBalance0 = await ins.payments(accounts[0]);
var withdrawalBalance1 = await ins.payments(accounts[1]);
var withdrawal = await ins.withdrawPayments(accounts[0], {from: accounts[0]});
var withdraww1 = await ins.withdrawPayments(accounts[1], {from: accounts[1]});


//after auction ends
var lockedBalanceForBidder = await ins.lockedBalanceInBids(accounts[0]);
var avail1 = await ins.availableBalanceToWithdraw(accounts[2]);

//gas estimation:
var txn = await ins.createPhysicalAuction.estimateGas(100,50,"0x000", 1010420436704);



//contract instance
var auctionInstance = await Auction.at("0xa6ca7d0775c3bac8e392e1e43f5e0390eb8590fd");
var balance = await web3.eth.getBalance("0xa6ca7d0775c3bac8e392e1e43f5e0390eb8590fd");
var bidCount = await auctionInstance.getBidCount().then(d => { console.log(d.toString())});
var endTime = await auctionInstance.endTime().then(d => { console.log(d.toString())});
var getLastBid = await auctionInstance.getLastBid().then(d => { console.log(d.toString())});
var status = await auctionInstance.auctionStatus();
//first bid
var bid = await auction2.getBidByIndex(0).then(d => { console.log(d) });
await auction2.reserveMet();
await auction2.auctionOwner();
var auctionOwner = await auction2.auctionOwner();
var auctionHouseAddress = await auction2.auctionHouse();
//Tools:
// Visualization: 
// - Surya - Call graphs https://github.com/ConsenSys/surya
// - Solgraph - solgraph contracts/AuctionHouse.sol > AuctionHouse.dot 
//            - dot -Tpng AuctionHouse.dot -o AuctionHouse.png

//Static code analysis
//Slither - https://github.com/crytic/slither#bugs-and-optimizations-detection
//Oyente - https://github.com/enzymefinance/oyente
//Securify - https://github.com/eth-sri/securify2




