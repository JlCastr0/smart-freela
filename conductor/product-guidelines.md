# Product Guidelines: Smart Freela

## Princípios de Design e UX
- **Clareza e Didática:** Como aplicação descentralizada acadêmica, a interface deve orientar o usuário em cada ação (ex.: alertar que uma operação exige confirmação na MetaMask e consome ETH de teste).
- **Consistência Visual com os Exemplos do Docente:**
  - Paleta baseada nos exemplos `urna-ledger-mvp-didatico` e `mural-simples`: tons azuis profundos (`--navy`), azul primário (`--blue`), verde de sucesso (`--green`), âmbar de atenção (`--orange`) e vermelho para disputas/erros (`--red`).
  - Layout em cartões brancos com sombras suaves sobre fundo cinza-azulado suave.
  - Indicador persistente de status de rede MetaMask no topo (`networkDot` verde quando na Sepolia).
- **Feedback Transparente de Transações:**
  - Indicadores em tempo real para os três estados: *Pendente*, *Confirmada* e *Falhou*.
  - Link direto para o Sepolia Etherscan para qualquer hash gerado.
- **Responsividade:**
  - Interface adaptável para dispositivos móveis e desktops utilizando CSS puro sem dependência de frameworks.

## Tom de Voz e Comunicação
- **Direto e Profissional:** Mensagens de erro amigáveis e explicativas (ex.: "Transação rejeitada na MetaMask", "Saldo insuficiente na Sepolia").
- **Terminologia:** Nomes claros para os estados do contrato (Aberto, Em Andamento, Entregue, Finalizado, Cancelado, Em Disputa).
