# 4AI 1Human: A Customizable Agentic Smart Wallet

A customizable, AI-driven wallet that lets you send funds with the exact requirements you choose or manage any transaction the way you envision. Simply use MetaMask, and whatever you imagine, our wallet will make it happen.

---

## Inspiration: How We Came Up with This Idea

One of our friends needed funds to stake in an ETHGlobal agentic hackathon. We sent her some ETH, but it disappeared immediately as her private key was compromised. This incident highlighted a serious gap: there was no easy way to control **how** the funds were used or to retrieve them if misused.

We thought:

> *“What if we could tell an AI, in plain language, exactly how we want our funds handled, like ‘Send 0.2 ETH to Alice, but only for staking in ETHGlobal; otherwise, return it’ and have the wallet automatically enforce these conditions?”*

That sparked the idea of a **Customizable Agentic Smart Wallet**, you simply describe the rules (time locks, passwords, usage restrictions, or refunds if conditions aren’t met), and the wallet takes care of the rest. No manual coding. No guesswork. The only limitation is your imagination.

---

## The Problem

Traditional wallets (EOAs) and payment flows handle only **basic transfers**, lacking native support for:

1. **Usage Restrictions** (e.g., “You must stake in a specific contract.”)  
2. **Conditional Withdrawals** (e.g., “Only allowed after a certain event or time.”)  
3. **Advanced Fund Management** (e.g., multi-sig approvals, milestone payouts.)

Essentially, when using MetaMask to send funds, you can’t impose custom requirements. Users who want these features end up writing their own code, relying on complex escrow services, or risking misuse of funds. Meanwhile, many AI-based wallet solutions focus on **standard transfers** only—they don’t allow you to truly customize how (or why) funds move.

**Our AI Smart Wallet changes that**: just **tell** the AI your desired conditions, and it will **enforce** them automatically—no advanced coding required.

## The Solution

1. **Understands Plain English Instructions**  
   > *Example: “Transfer 0.2 ETH to Bob. He can only withdraw if he stakes it in ETHGlobal by Friday; otherwise, it returns to me.”*

2. **Generates and Deploys Custom Logic Automatically**  
   In the background, our system:
   - **Generates** a contract tailored to your requirements (e.g., escrow, multi-sig, conditional payouts, password protection, and more).  
   - **Compiles** and **deploys** that contract on-chain.  
   - **Verifies** the contract on a blockchain explorer for transparency.

3. **Easy Wallet Interaction**  
   - Users can **easily interact** with the deployed and verified contract in plain english.  
   - For instance, if User A creates a fund transfer contract for User B, then User B can simply say, “Help me connect to contract address XYZ to claim my funds,” and the AI handles the rest.  
   - The wallet **recognizes** functions, **asks** for any needed parameters, and **executes** the calls.  
   - Recipients (or multiple signers, if multi-sig) use their own MetaMask or EOA to comply with the on-chain logic.  
   - **No manual coding** or complicated escrow setup required.

4. **Flexible Use Cases**  
   - Beyond simple transfers, you can define **multi-sig requirements**, **milestone payouts**, or **any customizable on-chain condition** the AI can interpret and enforce during contract generation.

---

## How Our Project Works

Though the user experiences a **single AI-driven interface** (the “agentic smart wallet”), there are actually **four specialized AI agents** working behind the scenes. We call this system **“4 AI, 1 Human”**, where you (the user) interact with these agents to manage your funds.

1. **Finn the Finder** (For Creating or Accessing Contracts)  
   - Determines whether the user wants to **create a new** contract or **interact with** an existing one.  
   - Detects invalid prompts (like prompt injection) and ensures the request is routed correctly.

2. **Cody the Creator** (For Creating Contracts)  
   - **Interprets** the user’s natural-language requirements to **generate** a new contract tailored to those conditions (e.g., “Stake before Friday,” “Require a password,” “Set up multi-sig”).  
   - Produces the underlying logic needed for that contract.

3. **Vee the Verifier** (For Connecting to Existing Contracts)  
   - **Verifies** any requested action against the **contract’s ABI**.  
   - Identifies which function the user intends to call, checks parameters, and then hands off to Dex the Developer for execution.

4. **Dex the Developer** (For Connecting to Existing Contracts)  
   - **Retrieves** the relevant function details from the contract’s ABI.  
   - **Prompts the user** for required parameters (e.g., “Which address do you want to withdraw to?”).  
   - **Executes** the action on-chain once all the necessary data is confirmed.

---

### Flow Behind the Scenes (Creating a Contract)

1. **User Command**  
   - The user types a plain-English instruction, such as:  
     > *“Send 0.2 ETH to Bob, but only if he stakes by Friday.”*  
   - **Finn** detects this is a **new contract request** (rather than interaction with an existing one).

2. **Contract Creation**  
   - **Cody** then uses those requirements to build the correct contract logic (escrow, conditions, etc.).  
   - The system **compiles** the contract, **deploys** it on-chain, and **verifies** it on a blockchain explorer.

---

### Flow Behind the Scenes (Connecting to an Existing Contract)

1. **Parameter Gathering & Execution**  
   - If the user wants to **interact with** an existing contract, **Vee** checks which function is being requested and validates the parameters.
      > *“Connect to contract 0XABC and withdraw 2 ETH.”*  
   - **Dex** fetches the contract’s ABI details, asks for any needed inputs, and **executes** the function on-chain.

2. **User Interaction**  
   - The user might sign **one transaction** for a single function call, or multiple transactions if there are several actions to perform.  
   - Recipients or authorized users can then connect to the contract through the **same AI interface**, simplifying the entire process.
