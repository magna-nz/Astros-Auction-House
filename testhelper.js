var ins = await AuctionHouse.deployed();

//create auction
var txn = await ins.createPhysicalAuction(100,50,"0x33333", 10420436704, {from: accounts[0]});

//place bid
var bid1 = await ins.placeBidPhysicalAuction(1, {from:accounts[1], value:100000000000000000});
var bid2 = await ins.placeBidPhysicalAuction(1, {from:accounts[2], value:110000000000000000});

var end = await ins.endPhysicalAuction(1, {from:accounts[0]});

//check available balance
var withdrawal = await ins.withdrawPayments(1, accounts[0]);


//gas estimation:
var txn = await ins.createPhysicalAuction.estimateGas(100,50,"0x000", 1010420436704);



//contract instance
var auctionInstance = await Auction.at("0x9654236de92db38faf4568272dee6d2a91f1d0d9");
var balance = await web3.eth.getBalance("0x9654236de92db38faf4568272dee6d2a91f1d0d9");
var bidCount = await auctionInstance.getBidCount().then(d => { console.log(d.toString())});
var endTime = await auctionInstance.endTime().then(d => { console.log(d.toString())});
var getLastBid = await auctionInstance.getLastBid().then(d => { console.log(d.toString())});
var status = await auctionInstance.auctionStatus();
var winner = await auctionInstance.auctionWinner();

var depositsOfAcc0 = await auctionInstance.depositsOf(accounts[0]).then(d => { console.log(d.toString())});
var depositsOfAcc1 = await auctionInstance.depositsOf(accounts[1]).then(d => { console.log(d.toString())});
var depositsOfAcc2 = await auctionInstance.depositsOf(accounts[2]).then(d => { console.log(d.toString())});

//first bid
var bid = await auction2.getBidByIndex(0).then(d => { console.log(d) });
await auction2.reserveMet();
await auction2.auctionOwner();
var auctionOwner = await auction2.auctionOwner();
var auctionHouseAddress = await auction2.auctionHouse();


//truffle console --network dashboard


//Tools:
// Visualization: 
// - Surya - Call graphs https://github.com/ConsenSys/surya
// - Solgraph - solgraph contracts/AuctionHouse.sol > AuctionHouse.dot 
//            - dot -Tpng AuctionHouse.dot -o AuctionHouse.png

//Static code analysis
//Slither - https://github.com/crytic/slither#bugs-and-optimizations-detection
//Oyente - https://github.com/enzymefinance/oyente
//Securify - https://github.com/eth-sri/securify2




