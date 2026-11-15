const fs = require('fs');

const artifactPath = './artifacts/contracts/smart-freela.sol/SmartFreela.json';
const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

const config = `// Endereço do contrato SmartFreela na rede Ethereum Sepolia.
// Atualize após fazer o deploy no Remix ou via script de deploy.
const CONTRACT_ADDRESS = "COLOQUE_O_ENDERECO_DO_CONTRATO_AQUI";

const CONTRACT_ABI = ${JSON.stringify(artifact.abi, null, 2)};
`;

fs.writeFileSync('./frontend/config.js', config);
console.log(`ABI exported to frontend/config.js with ${artifact.abi.length} entries.`);
