const AuctionHouse = artifacts.require("AuctionHouse.sol");

//const PhysicalAuction = artifacts.require("PhysicalAuction.sol");

require("dotenv").config({path: "../.env"});

module.exports = async function(deployer){
    await deployer.deploy(AuctionHouse);
}


// module.exports = async function(deployer){
//     let addr = await web3.eth.getAccounts();
//     await deployer.deploy(token, process.env.INITIAL_TOKENS);

//     await deployer.deploy(myKycContract);
//     await deployer.deploy(tokenSale, 1, addr[0], token.address, myKycContract.address); //token contract address

//     //now send the tokens to the sale
//     let instance = await token.deployed();
//     await instance.transfer(tokenSale.address, process.env.INITIAL_TOKENS)
// }

