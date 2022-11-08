const { assert, expect } = require("chai");
const { getNamedAccounts, deployments, ethers, network } = require("hardhat");
const { developmentChains, networkConfigs } = require("../../helper-hardhat-config");

developmentChains.includes(network.name) &&
    describe("Raffle unit test", function () {
        let raffle, vrfCoordinatorV2Mock, deployer, raffleEntranceFee, interval;
        const chainId = network.config.chainId;

        beforeEach(async function () {
            deployer = (await getNamedAccounts()).deployer;
            await deployments.fixture(["all"]);
            raffle = await ethers.getContract("Raffle", deployer);
            vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
            raffleEntranceFee = await raffle.getEntranceFee();
            interval = await raffle.getInterval();
        });

        describe("constructor", function () {
            it("Initializes the raffle correctly", async function () {
                const raffleState = await raffle.getRaffleState();
                const interval = await raffle.getInterval();
                assert.equal(raffleState.toString(), "0");
                assert.equal(interval.toString(), networkConfigs[chainId]["interval"]);
            });
        });

        describe("enterRaffle", function () {
            it("reverts when you dont pay enough", async () => {
                await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle__NotEnough");
            });

            it("records players when they enter", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                const playerFromContract = await raffle.getPlayer(0);
                assert.equal(playerFromContract, deployer);
            });

            it("emits event on enter", async () => {
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(
                    raffle,
                    "RaffleEnter"
                );
            });

            it("does not allow entrace when raffle is calculating", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);

                await raffle.performUpkeep([]);
                await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith(
                    "Raffle__NotOpen"
                );
            });
        });

        describe("checkUpkeep", () => {
            it("returns false if people haven't send any ETH", async () => {
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded);
            });

            it("return false if raffle is not open", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });

                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                await raffle.performUpkeep([]);
                const raffleState = await raffle.getRaffleState();
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert.equal(raffleState.toString(), "1");
                assert.equal(upkeepNeeded, false);
            });

            it("returns false if enough time has not passed", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]);
                await network.provider.send("evm_mine");
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(!upkeepNeeded);
            });

            it("returns true if everything is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 5]);
                await network.provider.send("evm_mine");
                const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]);
                assert(upkeepNeeded);
            });
        });

        describe("performUpkeep", () => {
            it("can only run if checkupkeep is true", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                const tx = await raffle.performUpkeep([]);
                assert(tx);
            });
            it("reverts when check upkeep is false", async () => {
                await expect(raffle.performUpkeep([])).to.be.revertedWith(
                    "Raffle__UpkeepNotNeeded"
                );
            });
            it("updates the raffle state, emits events, and calls the vrf coordinator", async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
                const txResponse = await raffle.performUpkeep([]);
                const txReceipt = await txResponse.wait(1);
                const requestId = txReceipt.events[1].args.requestId;
                const raffleState = await raffle.getRaffleState();
                console.log(raffleState);
                assert(requestId.toNumber() > 0);
                assert(raffleState == 1);
            });
        });

        describe("fulfillRandomWords", function () {
            beforeEach(async () => {
                await raffle.enterRaffle({ value: raffleEntranceFee });
                await network.provider.send("evm_increaseTime", [interval.toNumber() + 1]);
                await network.provider.send("evm_mine", []);
            });

            it("can only be called after performUpkeep", async () => {
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)
                ).to.be.revertedWith("nonexistent request");
                await expect(
                    vrfCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)
                ).to.be.revertedWith("nonexistent request");
            });

            it("picks a winner, resets the lottery, send money, Ting Ting..", async () => {
                const accounts = await ethers.getSigners();
                for (let i = 1; i < 4; i++) {
                    const playerAccountRaffle = raffle.connect(accounts[i]);
                    await playerAccountRaffle.enterRaffle({ value: raffleEntranceFee });
                }
                const startingTimeStamp = await raffle.getLastestTimeStamp();

                await new Promise(async (resolve, reject) => {
                    raffle.once("WinnerPicked", async () => {
                        console.log("Found the event");
                        try {
                            //const recentWinner = await raffle.getRecentWinner();
                            const raffleState = await raffle.getRaffleState();
                            const endingTimeStamp = await raffle.getLastestTimeStamp();
                            const numPlayers = await raffle.getNumberOfPlayers();
                            const winnerEndingBalance = (await accounts[1].getBalance()).toString();
                            assert.equal(numPlayers.toString(), "0");
                            assert.equal(raffleState.toString(), "0");
                            assert(endingTimeStamp + 30 > startingTimeStamp);
                            resolve();
                        } catch (error) {
                            reject(e);
                        }
                    });

                    const tx = await raffle.performUpkeep([]);
                    const txReceipt = await tx.wait(1);
                    const winnerStartingBalance = await accounts[1].getBalance();

                    await vrfCoordinatorV2Mock.fulfillRandomWords(
                        txReceipt.events[1].args.requestId,
                        raffle.address
                    );
                });
            });
        });
    });
