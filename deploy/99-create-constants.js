const { ethers, network } = require("hardhat");
const fs = require("fs");

const CONTRACT_ADDRESSES = "../nextjs_smartcontract_lottery/constants/contractAddresses.json";
const CONTRACT_ABI = "../nextjs_smartcontract_lottery/constants/abi.json";

module.exports = async () => {
    if (process.env.UPDATE_FRONT_END) {
        console.log("updating front end...");
        updateContractAddresses();
        updateAbi();
    }
};

const updateAbi = async () => {
    const raffle = await ethers.getContract("Raffle");
    fs.writeFileSync(CONTRACT_ABI, raffle.interface.format(ethers.utils.FormatTypes.json));
};

const updateContractAddresses = async () => {
    const raffle = await ethers.getContract("Raffle");
    const chainId = network.config.chainId.toString();
    const contractAddresses = JSON.parse(fs.readFileSync(CONTRACT_ADDRESSES, "utf-8"));
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId].includes(raffle.address)) {
            contractAddresses[chainId].push(raffle.address);
        }
    }
    {
        contractAddresses[chainId] = [raffle.address];
    }
    fs.writeFileSync(CONTRACT_ADDRESSES, JSON.stringify(contractAddresses));
};

module.exports.tags = ["all", "frontend"];
