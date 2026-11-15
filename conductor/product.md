# Product Definition: Smart Freela

## Visão Geral
Smart Freela é uma aplicação descentralizada (dApp) na rede Ethereum Sepolia voltada para a intermediação e liquidação financeira de serviços freelance por meio de smart contracts de custódia (*escrow*). O sistema elimina a necessidade de intermediários tradicionais centralizados, mitigando riscos de inadimplência e diminuindo taxas abusivas.

## Problema Resolvido
Plataformas web tradicionais de freelance cobram taxas de 10% a 20%, impõem regras unilaterais de disputa e atrasam repasses por semanas. O Smart Freela resolve isso com:
1. **Garantia de Fundos:** O cliente bloqueia o valor total em ETH no contrato antes do início do serviço.
2. **Entrega Auditável:** O freelancer submete o hash criptográfico comprobatório da entrega diretamente na blockchain.
3. **Liquidação Automatizada:** Liberação instantânea dos fundos após aprovação do cliente, retendo apenas uma taxa simbólica (2%) para manutenção do protocolo.
4. **Mediação Descentralizada:** Suporte a disputas com resolução transparente caso as partes discordem.

## Usuários e Personas
- **Cliente (Contratante):** Cria demandas de serviços, deposita ETH em custódia e aprova entregas.
- **Freelancer:** Encontra demandas abertas, aceita projetos, entrega o trabalho com hash comprobatório e recebe os fundos diretamente em sua carteira.
- **Administrador (Dono do Contrato):** Gerencia disputas e recolhe as taxas acumuladas do protocolo.

## Objetivos e Critérios de Sucesso
- Contrato inteligente desenvolvido em Solidity ^0.8.24 contendo todos os 7 grupos de recursos obrigatórios do Guia do Trabalho Prático.
- Frontend em HTML, CSS e JS puros com Web3.js 4.x via CDN, sem frameworks externos.
- Integração fluida com MetaMask para conexão, leitura e transações com ETH na rede Sepolia.
- Deploy público na Vercel e verificação do código no Sepolia Etherscan.
