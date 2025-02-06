async function main() {
    const Counter = await ethers.getContractFactory("Counter");
    const counter = await Counter.deploy();
    
    // Wait for the deployment transaction to be mined
    await counter.waitForDeployment();
  
    // Get the contract address
    const address = await counter.getAddress();
    console.log("Counter deployed to:", address);
  }
  
  main()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });