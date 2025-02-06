import axios from 'axios';
import fs from 'fs';
import path from 'path';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { address } = req.body;
    const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
    const ETHERSCAN_BASE = 'https://api-sepolia.etherscan.io/api';

    try {
        // First check if contract exists
        const checkCodeResponse = await axios.get(ETHERSCAN_BASE, {
            params: {
                apikey: ETHERSCAN_API_KEY,
                module: 'proxy',
                action: 'eth_getCode',
                address: address,
                tag: 'latest'
            }
        });

        if (checkCodeResponse.data.result === '0x') {
            throw new Error('Contract not deployed yet');
        }

        // Read the contract file
        const contractPath = path.join(process.cwd(), 'temp', 'contract.sol');
        const sourceCode = fs.readFileSync(contractPath, 'utf8');

        // Submit verification request using FormData format
        const verifyURL = `${ETHERSCAN_BASE}`;
        
        const formData = new URLSearchParams();
        formData.append('apikey', ETHERSCAN_API_KEY);
        formData.append('module', 'contract');
        formData.append('action', 'verifysourcecode');
        formData.append('sourceCode', sourceCode);
        formData.append('contractaddress', address);
        formData.append('codeformat', 'solidity-single-file');
        formData.append('contractname', 'ExclusiveFund');
        formData.append('compilerversion', 'v0.8.20+commit.a1b79de6');
        formData.append('optimizationUsed', '0');
        formData.append('runs', '200');
        formData.append('licenseType', '3');
        formData.append('chainid', '11155111');
        formData.append('evmversion', 'shanghai');

        
        const verifyResponse = await axios.post(verifyURL, formData, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('Initial Verification Response:', verifyResponse.data);

        if (verifyResponse.data.status === '1' && verifyResponse.data.result) {
            const guid = verifyResponse.data.result;

            // Wait before checking status
            await new Promise(resolve => setTimeout(resolve, 10000));

            // Check verification status using URL with query parameters
            const checkURL = `${ETHERSCAN_BASE}?module=contract&action=checkverifystatus&guid=${guid}&apikey=${ETHERSCAN_API_KEY}`;
            const checkResponse = await axios.get(checkURL);

            console.log('Check Verification Status:', checkResponse.data);

            res.status(200).json({
                status: checkResponse.data.status,
                result: checkResponse.data.result
            });
        } else {
            throw new Error(verifyResponse.data.result || 'Verification submission failed');
        }

    } catch (error) {
        console.error('Verification error details:', error.response?.data || error.message);
        res.status(500).json({ 
            error: error.message || 'Verification failed'
        });
    }
} 