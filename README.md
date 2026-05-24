🎰 FORTUNA — Simulação Educacional de Apostas
Este repositório contém o código-fonte do FORTUNA, uma aplicação interativa que simula uma máquina caça-níqueis (slot machine). O projeto foi desenvolvido como recurso prático e visual para um seminário de psicologia, com o objetivo de ilustrar graficamente o impacto dos jogos de azar na vida das pessoas e expor as táticas de design persuasivo utilizadas por plataformas de apostas para induzir ao vício.

🛠️ Tecnologias Utilizadas
O projeto foi construído utilizando tecnologias web padrão, focando em performance, responsividade e fidelidade visual às plataformas de apostas reais:

HTML5: Estruturação semântica da aplicação e dos componentes de áudio/modais.

CSS3 / Tailwind CSS: Estilização com estética cyberpunk/casino, animações de rotação de roletas (@keyframes), efeitos de brilho dinâmico (neon glows) e responsividade para dispositivos móveis.

JavaScript (ES6+): Lógica assíncrona baseada em Promises para controle do fluxo das jogadas, manipulação do DOM em tempo real e simulação dos algoritmos comportamentais.

🧠 A Psicologia por trás do Código (Engenharia Comportamental)
Diferente de um jogo comum, o motor lógico deste simulador (script.js) foi deliberadamente programado para demonstrar quatro táticas psicológicas de retenção e manipulação utilizadas pela indústria do jogo:

1. Ilusão de Ganho Inicial (Ganhos Falsos)
Nas primeiras jogadas (tentativas 1, 3 e 5), o algoritmo força um resultado vitorioso (type: 'win'). Isso replica o efeito do "ganho de iniciante", gerando uma falsa percepção de sorte e liberando picos de dopamina que estimulam o jogador a continuar.

2. O Efeito Quase-Vitória (Near-Miss Effect)
Nas jogadas 2 e 4, o código ativa a mecânica de Near-Miss. A roleta exibe dois símbolos iguais (7️⃣) e faz a terceira roleta tremer (wrapper.classList.add('shake')) antes de escorregar para um símbolo diferente. O cérebro do usuário processa isso não como uma perda, mas como uma "quase vitória", o que ativa os mesmos centros de recompensa neurológica de um ganho real, impulsionando a persistência no comportamento de risco.

3. Técnicas Abusivas de Retenção (Saque Bloqueado)
Ao clicar no botão "Solicitar Saque", a interface dispara um modal de bloqueio aleatório (openRetainModal()). São simuladas três barreiras reais:

Exigência de valor mínimo abusivo (R$ 500,00).

Falsos bônus ativos pendentes (obrigação de apostar mais para liberar o dinheiro).

Análise de segurança retida por 48h.

4. Algoritmo de Perda Total no Gatilho (Bust)
Na 6ª jogada (BUST_AT: 6), o script corta o fluxo de ganhos e executa uma limpeza matemática da banca (G.balance = 0), simulando a ruína financeira inevitável do jogador a longo prazo e provando a máxima de que "A Casa Sempre Ganha".

🚀 Como Executar o Projeto
Como o projeto foi desenvolvido em Vanilla Architecture (HTML/CSS/JS puros), não é necessário instalar dependências complexas.

Clone este repositório ou baixe os arquivos:

Bash
git clone https://github.com/seu-usuario/fortuna-simulador-psicologia.git
Abra o arquivo index.html ou slot-machine-v2.html diretamente em qualquer navegador moderno (Chrome, Edge, Firefox, Safari).

Para uma experiência ideal de apresentação, utilize a ferramenta Live Server (extensão do VS Code) para carregar os recursos de áudio corretamente via protocolo HTTP.

📊 Roteiro sugerido para a Apresentação Acadêmica
Durante o seminário de psicologia, siga estes passos com a projeção da tela:

Apresente a Interface: Mostre as luzes piscando, o som convidativo e o saldo inicial de R$ 100,00. Explique que o design visual é projetado para parecer inofensivo e altamente estimulante.

Faça as Primeiras Jogadas: Convide o público a ver como o jogo parece "fácil" à medida que eles ganham dinheiro nas primeiras rodadas.

Destaque o Near-Miss: Chame a atenção para o tremor físico das roletas na jogada 2 e 4. Discuta como a frustração do "quase" é transformada em combustível para a próxima aposta.

Tente Sacar: Mostre a frustração do usuário ao tentar retirar o lucro e ser barrado por termos contratuais abusivos (as mecânicas de retenção).

A Ruína (Jogada 6): Veja a reação ao se deparar com a banca zerada e a consequente ativação do Painel de Conscientização, exibindo canais de ajuda real como o CVV (188) e o SENAD.

📜 Isenção de Responsabilidade (Disclaimer)
Este software é uma ferramenta estritamente educacional de apoio acadêmico. Não manipula dinheiro real, não coleta dados e serve exclusivamente para fins de conscientização sobre os perigos do Jogo Patológico (redefinido como transtorno aditivo no DSM-5 e CID-11).