const { ethers } = require("hardhat");

async function main() {
    try {
        // Get the Contract Factory
        const Contract = await ethers.getContractFactory("Contract");
        console.log("Deploying Contract...");
        
        // Deploy the contract
        const contract = await Contract.deploy();
        console.log("Waiting for deployment transaction...");
        
        // Wait for deployment to complete
        await contract.waitForDeployment();
        const address = await contract.getAddress();
        
        console.log("Contract deployed to:", address);
        return address;
    } catch (error) {
        console.error("Deployment error:", error);
        throw error;
    }
}

// Only execute if running directly
if (require.main === module) {
    main()
        .then(() => process.exit(0))
        .catch((error) => {
            console.error(error);
            process.exit(1);
        });
}

module.exports = main;