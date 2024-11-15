// SPDX-License-Identifier: MIT
pragma solidity ^0.8.8;

import "../lib/openzeppelin-contracts/contracts/utils/ReentrancyGuard.sol";

contract MiniBank is ReentrancyGuard{

    event Deposit(
        address indexed users,
        uint256 indexed accountId,
        uint256 value,
        uint256 timestamp
    );
    event WithdrawRequested(
        address indexed users,
        uint256 indexed usersId,
        uint256 indexed withdrawId,
        uint256 amount,
        uint256 timestamp
    );

    event Withdraw(uint256 indexed withdrawId,uint256 timestamp);
    event AccountCreated(address[] owners,uint256 indexed id, uint256 timestamp);

    struct WithdrawRequest {
        address user;
        uint256 amount;
        uint256 approvals;
        mapping(address=>bool) ownersApproved;
        bool approved;
    }

    struct Account {
        address[] users;
        uint256 balance;
        mapping(uint256 => WithdrawRequest) withdrawRequest;
    }

    mapping(uint256 => Account) accounts;
    mapping(address => uint[]) userAccounts;

    uint256 nextAccountId;
    uint256 nextWithDrawId;

    modifier accountOwner(uint256 _accountId) {
        bool isOwner;
        for(uint256 idx;idx < accounts[_accountId].users.length; idx++){
            isOwner = true;
            break;
        }
        require(isOwner,"you are not an owner this account");
        _;
    }

    modifier validOwners(address[] calldata owners) {
        require(owners.length + 1 <= 4,"maximum of 3 owners per account");
        for (uint x; x < owners.length; x++ ) {
            if (owners[x] == msg.sender){
                revert("no duplicate owner");
            }
            for (uint y = x + 1; y < owners.length; y++){
                if(owners[x] == owners[y]){
                    revert("no duplicate owner");
                }
            }
        }
        _;
    }

    modifier sufficientBalance(uint256 _accountId, uint256 _amount){
        require(accounts[_accountId].balance >= _amount,"insufficient balance");
        _;
    }

    modifier canApprove(uint256 _accountId,uint256 _withdrawId){
        require(!accounts[_accountId].withdrawRequest[_withdrawId].approved,"this request allready approved");
        require(accounts[_accountId].withdrawRequest[_withdrawId].user != msg.sender,"you cannot approve this request");
        require(accounts[_accountId].withdrawRequest[_withdrawId].user != address(0),"this request does not exist");
        require(!accounts[_accountId].withdrawRequest[_withdrawId].ownersApproved[msg.sender],"you are already approved this request");
        _;
    }

    modifier canWithdraw(uint256 _accountId, uint256 _withdrawId){
        require(accounts[_accountId].withdrawRequest[_withdrawId].user == msg.sender,"you did not create this request");
        require(accounts[_accountId].withdrawRequest[_withdrawId].approved,"this request is not approved");
        _;
    }

    function deposit(uint256 _accountId) external payable accountOwner(_accountId){
        accounts[_accountId].balance += msg.value;
    }

    function createAccount(address[] calldata _otherOwners) 
    external 
    validOwners(_otherOwners)
    {
        address[] memory owners = new address[](_otherOwners.length + 1);
        owners[_otherOwners.length] = msg.sender;

        uint256 id = nextAccountId;

        for(uint256 idx;idx < owners.length;idx++){
            if (idx < owners.length - 1){
                owners[idx] = _otherOwners[idx];
            }

            if(userAccounts[owners[idx]].length > 2){
                revert("each user can have max of 3 accounts");
            }

            userAccounts[owners[idx]].push(id);
        }

        accounts[id].users = owners;
        nextAccountId++;
        emit AccountCreated(owners,id,block.timestamp);

    }

    function requestWithdraw(uint256 _accountId,uint256 _amount) external accountOwner(_accountId) sufficientBalance(_accountId,_amount){
        uint Id = nextWithDrawId;
        WithdrawRequest storage request = accounts[_accountId].withdrawRequest[Id];
        request.user = msg.sender;
        request.amount = _amount;
        nextWithDrawId++;
        emit WithdrawRequested(msg.sender, _accountId,Id,_amount,block.timestamp);
    }

    function approveWithdraw(uint256 _accountId, uint256 _withdrawId) external accountOwner(_accountId) canApprove(_accountId,_withdrawId){
        WithdrawRequest storage request = accounts[_accountId].withdrawRequest[_withdrawId];
        request.approvals++;
        request.ownersApproved[msg.sender] = true;

        if(request.approvals == accounts[_accountId].users.length -1){
            request.approved = true;
        }
    }

    function withdraw(uint256 _accountId, uint256 _withdrawId) 
    external
    canWithdraw(_accountId, _withdrawId)
    {
        uint256 amount = accounts[_accountId].withdrawRequest[_withdrawId].amount;
        require(accounts[_accountId].balance >= amount,"insufficient balance");

        accounts[_accountId].balance -= amount;

        (bool isSent,) = payable(msg.sender).call{value: amount}("");
        require(isSent);

        emit Withdraw(_withdrawId, block.timestamp);
    }

    function getBalance(uint256 _accountId) public view returns(uint256){
        return accounts[_accountId].balance;
    }

    function getOwner(uint256 _accountId) public view returns(address[] memory){
        return accounts[_accountId].users;
    }

    function getApproval(uint256 _accountId, uint256 _withdrawId) public view returns(uint256){
        return accounts[_accountId].withdrawRequest[_withdrawId].approvals;
    }

    function getAccounts() public view returns(uint256[] memory){
        return userAccounts[msg.sender];
    }
}