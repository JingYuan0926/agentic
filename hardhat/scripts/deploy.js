const { ethers } = require("hardhat");

async function main() {
    try {
        // Get the Contract Factory
        const Counter = await ethers.getContractFactory("Counter");
        console.log("Deploying Counter...");
        
        // Deploy the contract
        const counter = await Counter.deploy();
        console.log("Waiting for deployment transaction...");
        
        // Wait for deployment to complete
        await counter.waitForDeployment();
        const address = await counter.getAddress();
        
        console.log("Counter deployed to:", address);
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