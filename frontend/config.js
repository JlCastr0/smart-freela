// Endereço do contrato SmartFreela na rede Ethereum Sepolia.
const CONTRACT_ADDRESS = "0xaAe2fb64bB43e03e1C1563c59588EbF62EeD2640";

const CONTRACT_ABI = [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [],
    "name": "AcessoNegado",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "DadosInvalidos",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "FalhaNoPagamento",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "PercentualInvalido",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ProjetoInexistente",
    "type": "error"
  },
  {
    "inputs": [
      {
        "internalType": "enum SmartFreela.StatusProjeto",
        "name": "atual",
        "type": "uint8"
      },
      {
        "internalType": "enum SmartFreela.StatusProjeto",
        "name": "esperado",
        "type": "uint8"
      }
    ],
    "name": "StatusIncorreto",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ValorInvalido",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "solicitante",
        "type": "address"
      }
    ],
    "name": "DisputaAberta",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valorFreelancer",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valorCliente",
        "type": "uint256"
      }
    ],
    "name": "DisputaResolvida",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "freelancer",
        "type": "address"
      }
    ],
    "name": "ProjetoAceito",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "cliente",
        "type": "address"
      }
    ],
    "name": "ProjetoCancelado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "cliente",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "ProjetoCriado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "bytes32",
        "name": "hashEntrega",
        "type": "bytes32"
      }
    ],
    "name": "ProjetoEntregue",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "freelancer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valorPago",
        "type": "uint256"
      }
    ],
    "name": "ProjetoFinalizado",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {
        "indexed": true,
        "internalType": "address",
        "name": "recebedor",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      }
    ],
    "name": "TaxasSacadas",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "TAXA_PLATAFORMA_PERCENTUAL",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "abrirDisputa",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "aceitarProjeto",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "aprovarEFinalizar",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "ativo",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "valorBruto",
        "type": "uint256"
      }
    ],
    "name": "calcularValorLiquido",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "pure",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "cancelarProjeto",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "string",
        "name": "titulo",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "descricao",
        "type": "string"
      }
    ],
    "name": "criarProjeto",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "novoId",
        "type": "uint256"
      }
    ],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "dono",
    "outputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "hashEntrega",
        "type": "bytes32"
      }
    ],
    "name": "entregarProjeto",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "usuario",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "inicio",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "limite",
        "type": "uint256"
      }
    ],
    "name": "listarProjetosDoUsuario",
    "outputs": [
      {
        "internalType": "uint256[]",
        "name": "ids",
        "type": "uint256[]"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      }
    ],
    "name": "obterProjeto",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "id",
            "type": "uint256"
          },
          {
            "internalType": "address payable",
            "name": "cliente",
            "type": "address"
          },
          {
            "internalType": "address payable",
            "name": "freelancer",
            "type": "address"
          },
          {
            "internalType": "uint256",
            "name": "valor",
            "type": "uint256"
          },
          {
            "internalType": "string",
            "name": "titulo",
            "type": "string"
          },
          {
            "internalType": "string",
            "name": "descricao",
            "type": "string"
          },
          {
            "internalType": "bytes32",
            "name": "hashEntrega",
            "type": "bytes32"
          },
          {
            "internalType": "enum SmartFreela.StatusProjeto",
            "name": "status",
            "type": "uint8"
          },
          {
            "internalType": "uint256",
            "name": "criadoEm",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "finalizadoEm",
            "type": "uint256"
          }
        ],
        "internalType": "struct SmartFreela.Projeto",
        "name": "",
        "type": "tuple"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "projetos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "address payable",
        "name": "cliente",
        "type": "address"
      },
      {
        "internalType": "address payable",
        "name": "freelancer",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "valor",
        "type": "uint256"
      },
      {
        "internalType": "string",
        "name": "titulo",
        "type": "string"
      },
      {
        "internalType": "string",
        "name": "descricao",
        "type": "string"
      },
      {
        "internalType": "bytes32",
        "name": "hashEntrega",
        "type": "bytes32"
      },
      {
        "internalType": "enum SmartFreela.StatusProjeto",
        "name": "status",
        "type": "uint8"
      },
      {
        "internalType": "uint256",
        "name": "criadoEm",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "finalizadoEm",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "name": "projetosParticipados",
    "outputs": [
      {
        "internalType": "bool",
        "name": "",
        "type": "bool"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "reputacaoInicialPadrao",
    "outputs": [
      {
        "internalType": "int256",
        "name": "",
        "type": "int256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "uint256",
        "name": "id",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "percentualFreelancer",
        "type": "uint256"
      }
    ],
    "name": "resolverDisputa",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "sacarTaxas",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "taxasAcumuladas",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "totalProjetos",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
