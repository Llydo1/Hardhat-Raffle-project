const { ethers } = require("hardhat");

const networkConfigs = {
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entranceFee: ethers.utils.parseEther("0.01"),
        gaslane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "6220",
        callbackGasLimit: "500000",
        interval: "30",
        explorer_url: "https://goerli.etherscan.io/",
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        gaslane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        callbackGasLimit: "500000",
        interval: "30",
    },
};

const developmentChains = ["hardhat", "localhost"];

module.exports = {
    networkConfigs,
    developmentChains,
};