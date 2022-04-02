// SPDX-License-Identifier: MIT
pragma solidity ^0.8.1;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Address.sol";
import ".././node_modules/@openzeppelin/contracts/security/ReentrancyGuard.sol";


/*
* This escrow contract copied most from Open Zeppelin Escrow contract
* I need extra functionality, such as moving funds between winning auctions
* And auction owners. I did not want to edit the Escrow smart contract
* and inheriting didn't make much sense because I want to keep the _deposits
* array private
*/

/// @title An escrow contract for auction
/// @author Daniel Anderson
/// @notice You can use this contract to store funds in escrow
/// @dev All function calls only by Auction Owner contract. Funds can move between auction winner and auction owner
contract AuctionEscrow is Ownable, ReentrancyGuard{
    using Address for address payable;
    using SafeMath for uint256;

    ///@notice Emitted when a deposit is made
    event Deposited(address indexed payee, uint256 weiAmount);

    ///@notice Emitted when a withdrawal is made
    event Withdrawn(address indexed payee, uint256 weiAmount);

    ///@notice Emitted when funds move between auction winner and auction owner
    event FundsMoved(address indexed from, address indexed to, uint256 weiAmount);

    mapping(address => uint256) private _deposits;

    ///@dev Deposit Ether into the Escrow service
    function deposit(address payee) public payable virtual onlyOwner {
        uint256 amount = msg.value;
        _deposits[payee] += amount;
        emit Deposited(payee, amount);
    }

    ///@dev Check value of funds available for an address in Escrow service
    function depositsOf(address payee) public view returns (uint256) {
        return _deposits[payee];
    }

    ///@dev Move ether between addresses in Escrow service
    function moveFundsBetween(address from, address to, uint256 amount) internal virtual onlyOwner{
        //check theres enough balances
        require(_deposits[from] >= amount, "not enough funds to move");

        //do the swap
        _deposits[from] -= amount;
        _deposits[to] += amount;

        emit FundsMoved(from, to, amount);
    }

    ///@dev Withdraw payments available in Escrow service
    function withdraw(address payable payee) public virtual onlyOwner nonReentrant{
        uint256 payment = _deposits[payee];

        _deposits[payee] = 0;

        payee.sendValue(payment);

        emit Withdrawn(payee, payment);
    }
}