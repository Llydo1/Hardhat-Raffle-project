const { ethers, network } = require("hardhat");

const mockKeepers = async () => {
    const raffle = await ethers.getContract("Raffle");
    const checkData = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(""));
    const { upkeepNeeded } = await raffle.callStatic.checkUpkeep(checkData);
    if (upkeepNeeded) {
        const tx = await raffle.performUpkeep(checkData);
        const txReceipt = await tx.wait(1);
        const requestId = txReceipt.events[1].args.requestId;
        console.log(`Performed upkeep with requestId: ${requestId}`);
        console.log(network.config.chainId);
        network.config.chainId == 31337 && (await mockVrf(requestId, raffle));
    } else {
        console.log("no upkeep needed");
    }
};

const mockVrf = async (requestId, raffle) => {
    console.log("We are on a local network, lets do the performupkeep");
    const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
    const txResponse = await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, raffle.address);
    txResponse.wait(1);
    console.log("Responded!");
    const recentWinner = await raffle.getRecentWinner();
    console.log(`The winner is: ${recentWinner}`);
};

mockKeepers()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
