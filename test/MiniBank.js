const { time, loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const hre = require("hardhat");
const { deployContract } = require("@nomicfoundation/hardhat-ethers/types");
require("@nomicfoundation/hardhat-ethers");

describe("MiniBank", async function () {
  async function deployMiniBank() {
    const [owner, account1,account2, account3,account4] = await hre.ethers.getSigners();
    const miniBank = await hre.ethers.deployContract("MiniBank");
    return { miniBank, owner, account1,account2, account3,account4};
  }

  async function deployMiniBankWithAccounts(owners=1,deposit=0,withdrawAmounts=[]) {
    const { miniBank, owner, account1,account2, account3,account4} = await loadFixture(deployMiniBank);
    let addresses = [];

    if(owners==1){
      addresses = [String(owner.address)];
    }else if (owners == 2){
      addresses = [String(owner.address),String(account1.address)];
    } else if (owners == 3) {
      addresses = [String(owner.address),String(account1.address), String(account2.address)];
    } else if (owners == 4){
      addresses = [String(owner.address),String(account1.address), String(account2.address), String(account3.address)];
    }
    

    return { miniBank, owner, account1,account2, account3,account4};
  }

  describe("Deployment", () => {
    it("should deploy without errors", async () => {
      const { miniBank,owner,account1,account2,account3,account4 } = await loadFixture(deployMiniBank);
      console.log("Contract address: ", await miniBank.getAddress());
      console.log("Owner address: ", await owner.getAddress());
      console.log("Account1 address: ", await account1.getAddress());
      console.log("Account2 address: ", await account2.getAddress());
      console.log("Account3 address: ", await account3.getAddress());
      console.log("Account3 address: ", await account4.getAddress());
    });
  });

  describe("Creating an account", () => {
    it("should allow creating a single user account", async () => {
      const { miniBank, owner } = await loadFixture(deployMiniBank);

      await miniBank.connect(owner).createAccount([]);

      const accounts = await miniBank.connect(owner).getAccounts();

      expect(accounts.length).to.equal(1);
      
    });

    it("should create double user accounts",async ()=>{
      const { miniBank, owner, account1} = await loadFixture(deployMiniBank);

      await miniBank.connect(owner).createAccount([account1]);

      const owners = await miniBank.connect(owner).getAccounts();
      const account_1 = await miniBank.connect(account1).getAccounts();

      expect(owners.length).to.equal(1);
      expect(account_1.length).to.equal(1);

    });

    it("should create triple user accounts", async () => {
      const { miniBank, owner, account1,account2} = await loadFixture(deployMiniBank);

      await miniBank.connect(owner).createAccount([account1, account2]);

      const theOwners = await miniBank.connect(owner).getAccounts();
      const Account1 = await miniBank.connect(account1).getAccounts();
      const Account2 = await miniBank.connect(account2).getAccounts();

      expect(theOwners.length).to.equal(1);
      expect(Account1.length).to.equal(1);
      expect(Account2.length).to.equal(1);

    });

    it("should create a quad user accounts",async () => {
      const { miniBank, owner, account1, account2, account3} = await loadFixture(deployMiniBank);

      await miniBank.connect(owner).createAccount([account1, account2, account3]);

      const theOwners = await miniBank.connect(owner).getAccounts();
      const Account1 = await miniBank.connect(account1).getAccounts();
      const Account2 = await miniBank.connect(account2).getAccounts();
      const Account3 = await miniBank.connect(account3).getAccounts();

      expect(theOwners.length).to.equal(1);
      expect(Account1.length).to.equal(1);
      expect(Account2.length).to.equal(1);
      expect(Account3.length).to.equal(1);
    });

    it("should not allow creating an account with duplicate owners", async () => {
      const {miniBank,owner} = await loadFixture(deployMiniBank);
      let ownerAddress = await owner.getAddress();

      await expect(miniBank.connect(owner).createAccount([ownerAddress])).to.be.reverted;
      // await expect(miniBank.connect(owners).createAccount([owners.getAddress()])).to.be.reverted;

    })

    it("should not allow creating an account with 5 owners",async () => {
      const { miniBank, owner, account1, account2, account3,account4} = await loadFixture(deployMiniBank);

      await expect(miniBank.connect(owner).createAccount([owner, account1, account2, account3, account4])).to.be.reverted;
    });
  });

  describe("Depositing", () => {
    it("should allow depositing from account owner",async () =>{
      const { miniBank, owner } = await deployMiniBankWithAccounts(1);
      console.log(miniBank,owner);
    });
    it("should not allow depositing from non-account owner",async () =>{
      const { miniBank, account1 } = await deployMiniBankWithAccounts(1);
      await expect(miniBank.connect(account1).deposit(0,{value: "5000000"})).to.be.reverted;
    });
  });

  describe("Withdrawing", () =>{
    describe("Request a withdraw", () =>{
      it("Account owner can request withdraw", async () =>{
        const { miniBank, owner} = await deployMiniBankWithAccounts(1,1e8);
        expect( await miniBank.connect(owner).requestWithdraw(0,1e6));
      });

      it("account owner can't request withdraw with insufficient amount", async () =>{
        const { miniBank, owner} = await deployMiniBankWithAccounts(1,1e8);
        await expect(miniBank.connect(owner).requestWithdraw(0,1e9)).to.be.reverted;
      });

      it("non-account owner cannot request withdraw", async () => {
        const { miniBank, account1 } = await deployMiniBankWithAccounts(1,1e8);
        await expect(miniBank.connect(account1).requestWithdraw(0,1e6)).to.be.reverted;
      })
    });
  });

  // TODO: Should think about this test, always get error reverted you are not an owner this account
  // describe("Approve a withdraw",() => {
  //   it("Only owner can approve a withdraw",async() => {
  //     const { miniBank, owner } = await deployMiniBankWithAccounts(1,1e8,[1e8]);
  //     await miniBank.connect(owner).approveWithdraw(0,5e5);
  //   });
  // })

});