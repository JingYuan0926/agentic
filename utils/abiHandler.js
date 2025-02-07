import fs from 'fs';
import path from 'path';

const ABI_PATH = path.join(process.cwd(), 'temp', 'contract_abi.json');

export const saveABI = async (abi, address) => {
    try {
        // Ensure temp directory exists
        const tempDir = path.join(process.cwd(), 'temp');
        if (!fs.existsSync(tempDir)) {
            fs.mkdirSync(tempDir, { recursive: true });
        }

        // Save ABI with address
        fs.writeFileSync(ABI_PATH, JSON.stringify({
            abi,
            address,
            timestamp: Date.now()
        }));
    } catch (error) {
        console.error('Error saving ABI:', error);
    }
};

export const getABI = async () => {
    try {
        if (fs.existsSync(ABI_PATH)) {
            const data = JSON.parse(fs.readFileSync(ABI_PATH, 'utf8'));
            return data;
        }
        return null;
    } catch (error) {
        console.error('Error reading ABI:', error);
        return null;
    }
}; 