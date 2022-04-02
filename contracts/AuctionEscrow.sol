// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

import ".././node_modules/@openzeppelin/contracts/access/Ownable.sol";
import ".././node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import ".././node_modules/@openzeppelin/contracts/utils/Address.sol";


contract AuctionEscrow is Ownable {
    using Address for address payable;
    using SafeMath for uint256;

    event Deposited(address indexed payee, uint256 weiAmount);
    event Withdrawn(address indexed payee, uint256 weiAmount);
    event FundsMoved(address indexed from, address indexed to, uint256 weiAmount);

    mapping(address => uint256) private _deposits;

    function deposit(address payee) public payable virtual onlyOwner {
        uint256 amount = msg.value;
        _deposits[payee] += amount;
        emit Deposited(payee, amount);
    }

    function depositsOf(address payee) public view returns (uint256) {
        return _deposits[payee];
    }

    function moveFundsBetween(address from, address to, uint256 amount) internal virtual onlyOwner{
        //check theres enough balances
        //uint256 balance = _deposits[from];
        require(_deposits[from] >= amount, "not enough funds to move");
        assert(_deposits[from].sub(amount) >= 0);
        require((_deposits[to] + amount) >= 0, "to address should be over 0 if moving funds");

        //do the swap
        _deposits[from] -= amount;
        _deposits[to] += amount;

        emit FundsMoved(from, to, amount);
    }

    function withdraw(address payable payee) public virtual onlyOwner {
        uint256 payment = _deposits[payee];

        _deposits[payee] = 0;

        payee.sendValue(payment);

        emit Withdrawn(payee, payment);
    }
}