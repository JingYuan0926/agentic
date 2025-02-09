const { ethers } = require("hardhat");

async function main() {
    try {
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);

        const Contract = await ethers.getContractFactory("Contract");
        console.log("Deploying Contract...");
        const constructorArgs = ["0xf1a7b4b4B16fc24650D3dC96d5112b5c1F309092", "1", "0000", "false", ""]; // Placeholder for constructor arguments
        const contract = await Contract.deploy(...constructorArgs);
        
        console.log("Waiting for deployment transaction...");
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log("Contract deployed to:", address);
        console.log("Constructor arguments:", constructorArgs);
        return address;
    } catch (error) {
        console.error("Deployment error:", error);
        throw error;
    }
}

if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;