const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");
const hre = require("hardhat");
require("@nomicfoundation/hardhat-ethers");

describe("PrivateBank", async function () {
    async function deployPrivateBank() {
      const ownerPin = 123123;
      // Contracts are deployed using the first signer/account by default
      const [owner, otherAccount ] = await hre.ethers.getSigners();

      const PrivateBank = await hre.ethers.getContractFactory("PrivateBank");
      const privateBank = await PrivateBank.deploy(ownerPin);

      return { privateBank, owner, otherAccount };
    }

    describe("Deploying", () => {
        it("should deploy without errors", async () => {
        const { privateBank,owner,otherAccount  } = await loadFixture(deployPrivateBank);
        console.log("Contract address: ",privateBank.getAddress())
        console.log("Owner: ",owner.getAddress()); 
        console.log("otherUser: ",otherAccount.getAddress()); 
    });

    describe("Creating an account",()=>{
        it("Should owner can create a user",async ()=>{
          const { privateBank, owner, otherAccount  } = await loadFixture(deployPrivateBank);
          let newCustomerPin = 321321
          await privateBank.connect(owner).addCustomer(otherAccount.address,newCustomerPin);
        });

        it("Should non-owner cannot create a user", async ()=>{
          const { privateBank, otherAccount  } = await loadFixture(deployPrivateBank);
          let newCustomerPin = 321321
          await expect(privateBank.connect(otherAccount).addCustomer(otherAccount.address,newCustomerPin)).to.be.reverted;
        });
    });

    describe("Request to be a customer",()=>{
      it("should owner cannot request be a customer", async ()=>{
        const { privateBank, owner} = await loadFixture(deployPrivateBank);
        const ownerPin = 123123;
        await expect(privateBank.connect(owner).requestBeCustomer(ownerPin)).to.be.reverted;
      });
      it("should allow non-owner request be a customer", async () => {
        const { privateBank, otherAccount } = await loadFixture(deployPrivateBank);
        const newCustomerPin = 123123;
        await privateBank.connect(otherAccount).requestBeCustomer(newCustomerPin); 
      });
    });

    describe("Approve new customer", ()=>{
      it("should owner can approve new customer", async ()=>{
        const { privateBank,owner, otherAccount} = await loadFixture(deployPrivateBank);
        const newCustomerPin = 123123;
        await privateBank.connect(otherAccount).requestBeCustomer(newCustomerPin);
        await privateBank.connect(owner).approveNewCustomer(otherAccount.address);
      });
      it("should non-owner cannot approve new customer",async()=>{
        const { privateBank, otherAccount} = await loadFixture(deployPrivateBank);
        const newCustomerPin = 123123;
        await privateBank.connect(otherAccount).requestBeCustomer(newCustomerPin);
        await expect(privateBank.connect(otherAccount).approveNewCustomer(otherAccount.address)).to.be.reverted;
      })
    });

    describe("Change PIN",()=>{
      it("should authorized customer able change its PIN", async ()=>{
        const { privateBank, owner, otherAccount} = await loadFixture(deployPrivateBank);
        const oldCustomerPin = 123123;
        const newCustomerPin = 321321;
        await privateBank.connect(otherAccount).requestBeCustomer(oldCustomerPin);
        await privateBank.connect(owner).approveNewCustomer(otherAccount.address);
        await privateBank.connect(otherAccount).changeMyPin(oldCustomerPin,newCustomerPin);
      });

      it("unauthorized customer cannot change its PIN", async() => {
        const { privateBank, otherAccount} = await loadFixture(deployPrivateBank);
        const oldCustomerPin = 123123;
        const newCustomerPin = 321321;
        await privateBank.connect(otherAccount).requestBeCustomer(oldCustomerPin);
        await expect(privateBank.connect(otherAccount).changeMyPin(oldCustomerPin,newCustomerPin)).to.be.reverted;
      });
    });

    describe("Depositing",()=>{
      it("Owner can deposit and its balance is 1 ETH",async()=>{
        const { privateBank,owner } = await loadFixture(deployPrivateBank);
        const depositAmount = hre.ethers.parseEther("1");
        await expect(privateBank.connect(owner).deposit({value: depositAmount})).to.changeEtherBalances([owner,privateBank],[-depositAmount,depositAmount]);
        expect(String(await privateBank.connect(owner).getMyBalance())).to.equal(String(depositAmount));
      });

      it("unauthorized user cannot deposit",async ()=>{
        const { privateBank, otherAccount } = await loadFixture(deployPrivateBank);
        const depositAmount = hre.ethers.parseEther("1");
        await expect(privateBank.connect(otherAccount).deposit({value: depositAmount})).to.be.reverted;
      })
    })

});
});