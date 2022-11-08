const { network, ethers } = require("hardhat");
const { developmentChains, networkConfigs } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");

const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("30");

module.exports = async function ({ deployments, getNamedAccounts }) {
    const { log, deploy } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const transactionResponse = await vrfCoordinatorV2Mock.createSubscription();
        const transactionReceipt = await transactionResponse.wait();
        subscriptionId = transactionReceipt.events[0].args.subId;

        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, VRF_SUB_FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfigs[chainId]["vrfCoordinatorV2"];
        subscriptionId = networkConfigs[chainId]["subscriptionId"];
    }
    const entranceFee = networkConfigs[chainId]["entranceFee"];
    const gaslane = networkConfigs[chainId]["gaslane"];
    const callbackGasLimit = networkConfigs[chainId]["callbackGasLimit"];
    const interval = networkConfigs[chainId]["interval"];

    const args = [
        vrfCoordinatorV2Address,
        entranceFee,
        gaslane,
        subscriptionId,
        callbackGasLimit,
        interval,
    ];

    const raffle = await deploy("Raffle", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying...");
        await verify(raffle.address, networkConfigs[chainId]["explorer_url"], args);
    }

    //Additional update because in the next version of chainlink, it is required to add consumer to be able to be checked upkeep
    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, raffle.address);
    }
};

module.exports.tags = ["all", "raffle"];
