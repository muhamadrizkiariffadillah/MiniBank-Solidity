// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract PrivateBank is ReentrancyGuard{

    // Tracking logs
    event Deposit(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );
    
    event Withdraw(
        address indexed user,
        uint256 amount,
        uint256 timestamp
    );

    event Transfer( 
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 timestamp
    );

    struct Account{
        address walletUser;
        uint256 balance;
        uint256 pin;
        bool isApproved;
        uint256 createdAt;
    }

    address immutable owner;
    uint256 immutable percentContractFee;
    uint256 amountFeeTransferToOwner;

    mapping(address=>Account)  user;

    constructor(uint256 _ownerPin){
        owner = msg.sender;
        percentContractFee = 2;
        user[msg.sender].walletUser = msg.sender;
        user[msg.sender].isApproved = true;
        user[msg.sender].pin = _ownerPin;
        user[msg.sender].createdAt = block.timestamp;
    }

    modifier OnlyOwner(){
        require(msg.sender == owner,"you are not the owner");
        _;
    }

    modifier OnlyAutorizedUser(){
        require(user[msg.sender].isApproved,"you are not our customer");
        _;
    }

    modifier OnlyTruePin(uint256 _pin){
        require(user[msg.sender].pin == _pin,"pin is wrong");
        _;
    }
    
    modifier SufficientBalance(uint256 _amount){
        require(_amount <= user[msg.sender].balance,"insufficient balance");
        _;
    }

    modifier OnlyEven(uint256 _amount){
        require(_amount % 2 == 0,"amount must be an even number");
        _;
    }

    function addCustomer(address _newCustomer, uint256 _pin)
    external 
    OnlyOwner
    {
        user[_newCustomer].walletUser = _newCustomer;
        user[_newCustomer].pin = _pin;
        user[_newCustomer].isApproved = true;
    }

    function  approveNewCustomer(address _newCustomer) 
    external 
    OnlyOwner{
        user[_newCustomer].isApproved = true;
    }
    
    function requestBeCustomer(uint256 _myPin) external{
        require(!user[msg.sender].isApproved,"you have been being our customer");
        user[msg.sender].walletUser = msg.sender;
        user[msg.sender].pin = _myPin;
        user[msg.sender].isApproved = false;
        user[msg.sender].createdAt = block.timestamp;
    }

    function deposit()external payable OnlyAutorizedUser{
        user[msg.sender].balance += msg.value;
        emit Deposit(msg.sender, msg.value, block.timestamp);
    }

    function withdraw(uint256 _amount, uint256 _pin) external 
    OnlyAutorizedUser 
    SufficientBalance(_amount)
    OnlyTruePin(_pin)
    OnlyEven(_amount)
    {
        if (msg.sender != owner){
            amountFeeTransferToOwner = (_amount * percentContractFee) / 100;
            uint256 _amountAfterfee = _amount - amountFeeTransferToOwner;
            user[msg.sender].balance -= _amount;
            user[owner].balance += amountFeeTransferToOwner;
            (bool successUser,) = msg.sender.call{value: _amountAfterfee}("");
            require(successUser,"transfer failed");
        } else {
            user[msg.sender].balance -= _amount;
            (bool successUser,) = msg.sender.call{value: _amount}("");
            require(successUser,"transfer failed");
        }
        
        emit Withdraw(msg.sender,_amount,block.timestamp);
    }
    
    function transfer(address payable _to,uint256 _amount, uint256 _pin) external 
    OnlyAutorizedUser 
    SufficientBalance(_amount)
    OnlyTruePin(_pin)
    OnlyEven(_amount)
    {

        if(msg.sender!=owner){
            amountFeeTransferToOwner = (_amount * percentContractFee) / 100;
            uint256 _amountAfterfee = _amount - amountFeeTransferToOwner;
            user[msg.sender].balance -= _amount;
            user[owner].balance += amountFeeTransferToOwner;

            _to.transfer(_amountAfterfee);
        }else{
            user[msg.sender].balance -= _amount;

            _to.transfer(_amount);
        }
        
        emit Transfer(msg.sender,_to,_amount,block.timestamp);
    }

    function changeMyPin(uint256 _oldPin,uint256 _newPin) external 
    OnlyAutorizedUser 
    OnlyTruePin(_oldPin)
    {
        user[msg.sender].pin = _newPin;
    }

    function getMyBalance() public view returns(uint256){
        return user[msg.sender].balance;
    }
}