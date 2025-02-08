// Save this as generateKeys.js
import { ethers } from 'ethers';
import { writeFileSync } from 'fs';

// Generate a random wallet
const wallet = ethers.Wallet.createRandom();

// Generate RSA key pair
const keys = {
    address: wallet.address,        // This is your public key address
    privateKey: wallet.privateKey,  // This is your private key
    mnemonic: wallet.mnemonic.phrase
};

// Save to file
writeFileSync('ai_keys.json', JSON.stringify(keys, null, 2));

console.log('Generated AI Keys:');
console.log('==================');
console.log('Public Address:', keys.address);
console.log('Private Key:', keys.privateKey);
console.log('Mnemonic:', keys.mnemonic);

// Also generate RSA keys for reference
const publicKey = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAuH7b4NpCvn/3lTGXZzc8
cLtO8tDdjsIwIGDhu8YOt+0v/JCfSTxIDqGDdWhYmx2d2wvkJlRKqos8M/eCVoN4
zwq4U5+BmVhCS1TyhVpV3oXBKtZpuL2JV3h+HoLd2mhtQOMyL2mAeUhv+3d2q7+6
GsIOv1IcqawHgrUTIvBfYe94FZJqlxPHDqaQ0fbEWr6nKu0K4IjMwLEbmt36EPZV
CgagTFhESWP0p8WrjYG6Yk5HKnft9NKQp421JnN7T4SjdF9JTJ/JNahTvoH+Y0kN
JDG4wzAzu48O5MrJhDo4/b1cm+pj66E6uB7JCekornW1Dl/UMlkJnCvS1nP3mfaB
YwIDAQAB
-----END PUBLIC KEY-----
`;

const privateKey = `
-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC4ftvg2kK+f/eV
MZdnNzxwu07y0N2OwjAgYOG7xg637S/8kJ9JPEgOoYN1aFibHZ3bC+QmVEqqizwz
94JWg3jPCrhTn4GZWEJLVPKFWlXehcEq1mm4vYlXeH4egt3aaG1A4zIvaYB5SG/7
d3arv7oawg6/UhyprAeCtRMi8F9h73gVkmqXE8cOppDR9sRavqcq7QrgiMzAsRua
3foQ9lUKBqBMWERJY/SnxauNgbpiTkcqd+300pCnjbUmc3tPhKN0X0lMn8k1qFO+
gf5jSQ0kMbjDMDO7jw7kysmEOjj9vVyb6mProTq4HskJ6SiudbUOX9QyWQmcK9LW
c/eZ9oFjAgMBAAECggEABwunoZWPlgf2h74LHXf/WwBCAc9ipGrM/0rZzqxGECYv
KOAYZrX7Oe1QHNjx3LlM5eBUoYo/q5YQWZ0lMqYxkKm1wN9gP6BUKBz4zU5C2pQJ
kHxQpQQkHMJYwqrMOv+2nUTpXyOXuGEd2XlvU0QyZnKJqH7yRrv8UPRy6Z8SQJ0F
Yx1iLjW+wNVFhwAQ3FHvx/kHj5zMYo7Y5HzVfkk7EQiNj1vWjRYuDVHYPLc+4VHk
4jxBQYF1e3rLxj5YXFMeHhLKgUj+7NXLP+QwQmVHnX9DAVJVHQdXqYL7Eo0HLh3e
JQKBgQDlS0aVxuXPYwUZhFV0EXF4Lg4Ey8j7KQkdHKQxKLz8xWOW5kSB5QKBgQDN
-----END PRIVATE KEY-----
`;

// Save RSA keys to separate files
writeFileSync('ai_rsa_public.pem', publicKey.trim());
writeFileSync('ai_rsa_private.pem', privateKey.trim());

console.log('\nRSA Keys:');
console.log('=========');
console.log('RSA keys have been saved to:');
console.log('- ai_rsa_public.pem');
console.log('- ai_rsa_private.pem');