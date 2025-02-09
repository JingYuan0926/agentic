const { ethers } = require("hardhat");

async function main() {
    try {
        // Get password from environment variable
        const password = process.env.PASSWORD;
        if (!password) {
            throw new Error("No password provided in environment variable PASSWORD");
        }

        // Get the signer
        const [deployer] = await ethers.getSigners();
        console.log("Deploying contracts with account:", deployer.address);

        // Get the Contract factory
        const Contract = await ethers.getContractFactory("Contract");
        console.log("Deploying Contract...");
        
        // Deploy with password parameter
        const contract = await Contract.deploy(password);
        
        console.log("Waiting for deployment transaction...");
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log("Contract deployed to:", address);
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