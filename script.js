'use strict';

/* ──────────────────────────────────────────────────
   CONSTANTES
────────────────────────────────────────────────── */
const CFG = {
  INIT_BALANCE:    100,
  BET_DEFAULT:     5,
  BET_MIN:         1,
  BET_MAX:         50,
  BET_STEP:        1,
  SYM_H:           100,   // px – deve bater com --sym-h
  REEL_COUNT:      3,
  // Duração da frenagem de cada roleta (ms)
  BRAKE_DELAY:     [1400, 1900, 2400],
  // Tentativas que são near-miss (1-indexed)
  NEAR_MISS_AT:    new Set([2, 4]),
  // Tentativa de quebra total de banca
  BUST_AT:         6,
  // Multiplicadores de ganho
  MULT_MIN:        2,
  MULT_MAX:        5,
  // Mensagens de retenção de saque (exibidas aleatoriamente)
  RETAIN_MSGS: [
    {
      title: 'Saque Bloqueado',
      body:  'O valor mínimo para saque é de R$ 500,00. Continue jogando para liberar!'
    },
    {
      title: 'Bônus Ativo Pendente',
      body:  'Você possui bônus de boas-vindas ativos. É necessário apostar mais R$ 200,00 antes de sacar.'
    },
    {
      title: 'Verificação Pendente',
      body:  'Sua conta ainda está em análise de segurança. Aguarde 48h ou continue jogando para agilizar o processo.'
    },
  ],
};

/* ──────────────────────────────────────────────────
   SÍMBOLOS
────────────────────────────────────────────────── */
const SYMS = [
  { emoji:'7️⃣',  id:'seven'   },
  { emoji:'💎',  id:'diamond' },
  { emoji:'🍉',  id:'melon'   },
  { emoji:'🍒',  id:'cherry'  },
  { emoji:'🔔',  id:'bell'    },
  { emoji:'🎰',  id:'bar'     },
];
const SEVEN    = SYMS[0];
const NON_SEVEN = SYMS.filter(s => s.id !== 'seven');

/* ──────────────────────────────────────────────────
   ESTADO
────────────────────────────────────────────────── */
let G = createState();

function createState() {
  return {
    balance:    CFG.INIT_BALANCE,
    bet:        CFG.BET_DEFAULT,
    playCount:  0,
    lastWin:    0,
    totalBet:   0,
    spinning:   false,
    gameOver:   false,
    history:    [],   // 'w' | 'n' | 'l'
  };
}

/* ──────────────────────────────────────────────────
   REFS DO DOM
────────────────────────────────────────────────── */
const q  = id => document.getElementById(id);
const balanceEl    = q('balanceVal');
const lastWinEl    = q('lastWinVal');
const totalBetEl   = q('totalBetVal');
const betDisplayEl = q('betDisplay');
const statusEl     = q('statusMsg');
const spinBtn      = q('spinBtn');
const restartBtn   = q('restartBtn');
const awRestartBtn = q('awRestartBtn');
const playCountEl  = q('playCountEl');
const historyRow   = q('historyRow');
const winOverlay   = q('winOverlay');
const retainOverlay= q('retainOverlay');
const gameOverOverlay = q('gameOverOverlay');
const awarenessPanel = q('awarenessPanel');
const withdrawBtn  = q('withdrawBtn');
const confettiDiv  = q('confetti');

/* ──────────────────────────────────────────────────
   ÁUDIO
────────────────────────────────────────────────── */
function playSpinSound() {
  const audio = q('spinSound');
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function startReelSpinSound() {
  const audio = q('reelSpinSound');
  audio.currentTime = 0;
  audio.loop = true;
  audio.play().catch(() => {});
}

function stopReelSpinSound() {
  const audio = q('reelSpinSound');
  audio.pause();
  audio.currentTime = 0;
}

function playWinSound() {
  const audio = q('winSound');
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playMatchSound() {
  const audio = q('matchSound');
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function playLoseSound() {
  const audio = q('loseSound');
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

/* ──────────────────────────────────────────────────
   UTILIDADES
────────────────────────────────────────────────── */
const fmt   = v => 'R$ ' + Math.abs(v).toFixed(2).replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.');
const rand  = (a,b) => Math.floor(Math.random()*(b-a+1))+a;
const pick  = arr => arr[rand(0,arr.length-1)];
const wait  = ms => new Promise(r => setTimeout(r,ms));

/* ──────────────────────────────────────────────────
   CONSTRUÇÃO DAS STRIPS
────────────────────────────────────────────────── */
/**
 * Monta a strip com 20 símbolos aleatórios mais o símbolo-alvo
 * na posição 15 (índice 0-based), depois posiciona a strip
 * de modo que o índice 15 fique centralizado no reel (altura 220px,
 * centro em 110px, símbolo começa em 15*SYM_H=1500px → offset = 110-50-1500 = -1440).
 */
function buildStrip(stripEl, targetSym) {
  stripEl.innerHTML = '';
  // 15 símbolos de prefixo (rolagem)
  for (let i = 0; i < 15; i++) {
    addSymEl(stripEl, SYMS[i % SYMS.length]);
  }
  // Alvo no índice 15
  addSymEl(stripEl, targetSym);
  // 4 símbolos de sufixo
  for (let i = 0; i < 4; i++) {
    addSymEl(stripEl, SYMS[(i+2) % SYMS.length]);
  }
}

function addSymEl(parent, sym) {
  const d = document.createElement('div');
  d.className = 'sym';
  d.textContent = sym.emoji;
  parent.appendChild(d);
}

// Offset Y para que o índice 15 fique no centro do reel (altura 220px)
// centro visível: 220/2 = 110px; meio do símbolo: SYM_H/2 = 50px
// posição do item 15: 15 * SYM_H = 1500px
// translateY necessário: 110 - 50 - 1500 = -1440px
const TARGET_OFFSET = 110 - (CFG.SYM_H / 2) - (15 * CFG.SYM_H); // -1440

function initReels() {
  for (let i = 0; i < CFG.REEL_COUNT; i++) {
    const strip = q(`strip${i}`);
    buildStrip(strip, SYMS[i % SYMS.length]);
    strip.style.transition = 'none';
    strip.style.transform  = `translateY(${TARGET_OFFSET}px)`;
  }
}

/* ──────────────────────────────────────────────────
   ANIMAÇÃO DE GIRO
────────────────────────────────────────────────── */
/**
 * @param {number}  idx          - índice da roleta (0,1,2)
 * @param {object}  targetSym    - símbolo final
 * @param {number}  totalMs      - duração total do giro
 * @param {boolean} isNearMiss   - aplica mecânica near-miss nesta roleta
 */
async function spinReel(idx, targetSym, totalMs, isNearMiss = false) {
  const strip   = q(`strip${idx}`);
  const wrapper = q(`reel${idx}`);

  // Reconstrói a strip com o símbolo alvo
  buildStrip(strip, targetSym);

  // Reseta sem transição
  strip.style.transition = 'none';
  strip.style.transform  = 'translateY(0px)';
  wrapper.className = 'reel-wrap';   // remove glows anteriores

  await wait(20); // deixa o browser aplicar o reset

  // Fase 1: giro rápido (blur animado via classe CSS)
  strip.classList.add('is-spinning');

  const spinDur = totalMs - 420;
  strip.style.transition = `transform ${spinDur}ms cubic-bezier(0.15,0.05,0.3,1)`;
  // Move a strip para "quase" no alvo, com excesso de 320px
  strip.style.transform  = `translateY(${TARGET_OFFSET + 320}px)`;

  await wait(spinDur);
  strip.classList.remove('is-spinning');

  if (isNearMiss) {
    // Fase 2 near-miss: para um símbolo ACIMA do alvo (índice 14)
    const almostOffset = TARGET_OFFSET - CFG.SYM_H;
    strip.style.transition = `transform 180ms ease-out`;
    strip.style.transform  = `translateY(${almostOffset}px)`;
    await wait(200);

    // Tremor visual
    wrapper.classList.add('shake');
    await wait(480);
    wrapper.classList.remove('shake');

    // Escorrega para o alvo real (não é o 7)
    strip.style.transition = `transform 380ms cubic-bezier(0.34,1.56,0.64,1)`;
    strip.style.transform  = `translateY(${TARGET_OFFSET}px)`;
    await wait(400);

    // Flash dourado
    wrapper.classList.add('nm-flash');
    await wait(1200);
    wrapper.classList.remove('nm-flash');

  } else {
    // Frenagem suave com bounce
    strip.style.transition = `transform 380ms cubic-bezier(0.34,1.56,0.64,1)`;
    strip.style.transform  = `translateY(${TARGET_OFFSET}px)`;
    await wait(400);
  }
}

/* ──────────────────────────────────────────────────
   DEFINIÇÃO DE RESULTADO POR TENTATIVA
────────────────────────────────────────────────── */
function getOutcome(count) {
  // Tentativas 1–5: sempre ganha
  if (count >= 1 && count <= 5) {
    const isNear = CFG.NEAR_MISS_AT.has(count);
    if (isNear) {
      return {
        type: 'near',
        syms: [SEVEN, SEVEN, pick(NON_SEVEN)],
        nearReelIdx: 2,
        mult: rand(CFG.MULT_MIN, CFG.MULT_MAX),
      };
    }
    const s = pick(SYMS);
    return {
      type: 'win',
      syms: [s, s, s],
      nearReelIdx: -1,
      mult: rand(CFG.MULT_MIN, CFG.MULT_MAX),
    };
  }

  // Tentativa 6: perda total
  if (count === CFG.BUST_AT) {
    return {
      type: 'loss',
      syms: [SYMS[1], SYMS[3], SYMS[4]], // 💎 🍒 🔔
      nearReelIdx: -1,
      mult: 0,
    };
  }

  // Pós-6: game over
  return { type: 'gameover', syms: [], nearReelIdx: -1, mult: 0 };
}

/* ──────────────────────────────────────────────────
   SPIN PRINCIPAL
────────────────────────────────────────────────── */
async function doSpin() {
  if (G.spinning || G.gameOver) return;
  if (G.balance < G.bet) { setStatus('Saldo insuficiente!', 'loss'); return; }

  G.spinning   = true;
  G.playCount++;
  G.balance   -= G.bet;
  G.totalBet  += G.bet;
  G.lastWin    = 0;

  // Bloqueia controles
  spinBtn.disabled    = true;
  q('betDown').disabled = true;
  q('betUp').disabled   = true;
  withdrawBtn.disabled  = true;

  setStatus('Girando...', 'info');
  clearReelGlows();
  updateUI();
  playSpinSound();
  startReelSpinSound();

  const outcome = getOutcome(G.playCount);

  // Lança as roletas em cascata
  const spinJobs = [];
  for (let i = 0; i < CFG.REEL_COUNT; i++) {
    const isNear = (i === outcome.nearReelIdx);
    const sym    = outcome.syms[i] || pick(SYMS);
    const delay  = CFG.BRAKE_DELAY[i];
    spinJobs.push(
      wait(i * 130).then(() => spinReel(i, sym, delay, isNear))
    );
  }
  await Promise.all(spinJobs);

  stopReelSpinSound();

  // Processa resultado
  await applyOutcome(outcome);

  G.spinning = false;

  if (!G.gameOver) {
    spinBtn.disabled      = false;
    q('betDown').disabled = false;
    q('betUp').disabled   = false;
    withdrawBtn.disabled  = false;
  }

  updatePlayCounter();
}

/* ──────────────────────────────────────────────────
   APLICAÇÃO DO RESULTADO
────────────────────────────────────────────────── */
async function applyOutcome(outcome) {

  if (outcome.type === 'win') {
    const gain   = G.bet * outcome.mult;
    G.balance   += gain;
    G.lastWin    = gain;
    G.history.push('w');

    setReelGlow('win');
    setStatus(`✨ GANHOU! +${fmt(gain)} (${outcome.mult}×)`, 'win');
    updateUI();
    playWinSound();
    playMatchSound();
    launchConfetti(35);
    await wait(350);
    openWinModal(gain, `${outcome.mult}× sua aposta!`, false);

  } else if (outcome.type === 'near') {
    const bonusMult = Math.max(1, outcome.mult - 1);
    const gain      = G.bet * bonusMult;
    G.balance      += gain;
    G.lastWin       = gain;
    G.history.push('n');

    setReelGlow('near');
    setStatus(`⚡ QUASE! Bônus: +${fmt(gain)} (${bonusMult}×)`, 'near');
    updateUI();
    playWinSound();
    playMatchSound();
    launchConfetti(14);
    await wait(500);
    openWinModal(gain, `Near-miss bônus! (${bonusMult}×)`, true);

  } else if (outcome.type === 'loss') {
    G.balance  = 0;
    G.lastWin  = 0;
    G.history.push('l');
    G.gameOver = true;

    setReelGlow('loss');
    setStatus('💀 BANCA ZERADA!', 'loss');
    updateUI();
    playLoseSound();

    // Desativa tudo
    spinBtn.disabled      = true;
    withdrawBtn.disabled  = true;
    q('betDown').disabled = true;
    q('betUp').disabled   = true;
    restartBtn.style.display = 'block';

    updateHistoryPanel();
    updatePlayCounter();

    await wait(1000);
    showGameOverModal();
  }

  updateHistoryPanel();
}

/* ──────────────────────────────────────────────────
   UI — ATUALIZAÇÕES
────────────────────────────────────────────────── */
function updateUI() {
  balanceEl.textContent  = fmt(G.balance);
  totalBetEl.textContent = fmt(G.totalBet);
  betDisplayEl.textContent = fmt(G.bet);

  if (G.lastWin > 0) {
    lastWinEl.textContent = '+' + fmt(G.lastWin);
    lastWinEl.className   = 'stat-val green win-flash';
    setTimeout(() => lastWinEl.className = 'stat-val green', 2500);
  } else {
    lastWinEl.textContent = '—';
    lastWinEl.className   = 'stat-val';
    lastWinEl.style.color = '';
  }
}

function setStatus(msg, type = 'info') {
  statusEl.textContent = msg;
  statusEl.className   = `status ${type}`;
}

function updatePlayCounter() {
  playCountEl.textContent = `Jogada ${G.playCount} de ${CFG.BUST_AT}`;
}

function updateHistoryPanel() {
  historyRow.innerHTML = '';
  G.history.forEach(h => {
    const d = document.createElement('div');
    const labels = { w:'W', n:'N', l:'X' };
    d.className   = `h-dot ${h}`;
    d.textContent = labels[h];
    d.title       = h === 'w' ? 'Ganho' : h === 'n' ? 'Near-Miss' : 'Perda';
    historyRow.appendChild(d);
  });
}

/* ──────────────────────────────────────────────────
   GLOWS NAS ROLETAS
────────────────────────────────────────────────── */
function setReelGlow(type) {
  const cls = type === 'win' ? 'glow-win' : type === 'near' ? 'glow-near' : 'glow-loss';
  for (let i = 0; i < CFG.REEL_COUNT; i++) {
    const w = q(`reel${i}`);
    w.className = `reel-wrap ${cls}`;
  }
}

function clearReelGlows() {
  for (let i = 0; i < CFG.REEL_COUNT; i++) {
    q(`reel${i}`).className = 'reel-wrap';
  }
}

/* ──────────────────────────────────────────────────
   MODAIS
────────────────────────────────────────────────── */
function openWinModal(amount, sub, isNear) {
  q('winIcon').textContent  = isNear ? '⚡' : '🎉';
  q('winTitle').textContent = isNear ? 'NEAR-MISS BÔNUS!' : 'VOCÊ GANHOU!';
  q('winAmount').textContent = '+' + fmt(amount);
  q('winSub').textContent   = sub;
  winOverlay.classList.add('open');
}

function closeWinModal() { winOverlay.classList.remove('open'); }

function openRetainModal() {
  const msg = pick(CFG.RETAIN_MSGS);
  q('retainTitle').textContent = msg.title;
  q('retainMsg').textContent   = msg.body;
  retainOverlay.classList.add('open');
}

function closeRetainModal() { retainOverlay.classList.remove('open'); }

function closeGameOverModal() { 
  gameOverOverlay.classList.remove('open');
  showAwareness();
}

/* ──────────────────────────────────────────────────
   TELA DE CONSCIENTIZAÇÃO
────────────────────────────────────────────────── */
function showAwareness() {
  awarenessPanel.classList.add('visible');
  // Suave scroll até o painel
  setTimeout(() => awarenessPanel.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200);
}

function showGameOverModal() {
  gameOverOverlay.classList.add('open');
}

/* ──────────────────────────────────────────────────
   CONFETES
────────────────────────────────────────────────── */
function launchConfetti(count) {
  confettiDiv.innerHTML = '';
  const colors = ['#F0C040','#C084FC','#00D4FF','#2ED573','#FF4757','#fff','#FF9500'];
  for (let i = 0; i < count; i++) {
    const p   = document.createElement('div');
    p.className = 'cp';
    const sz  = rand(6,14);
    p.style.cssText = [
      `left:${rand(3,97)}%`,
      `width:${sz}px`,
      `height:${sz}px`,
      `background:${pick(colors)}`,
      `border-radius:${rand(0,1)?'50%':'3px'}`,
      `animation-duration:${rand(1800,3400)}ms`,
      `animation-delay:${rand(0,600)}ms`,
    ].join(';');
    confettiDiv.appendChild(p);
  }
  setTimeout(() => { confettiDiv.innerHTML = ''; }, 4200);
}

/* ──────────────────────────────────────────────────
   APOSTA — AJUSTE
────────────────────────────────────────────────── */
function changeBet(delta) {
  G.bet = Math.min(
    Math.max(G.bet + delta * CFG.BET_STEP, CFG.BET_MIN),
    Math.min(CFG.BET_MAX, G.balance)
  );
  updateUI();
}

/* ──────────────────────────────────────────────────
   REINICIAR
────────────────────────────────────────────────── */
function restart() {
  closeWinModal();
  closeRetainModal();
  closeGameOverModal();
  G = createState();

  spinBtn.disabled      = false;
  withdrawBtn.disabled  = false;
  q('betDown').disabled = false;
  q('betUp').disabled   = false;
  restartBtn.style.display = 'none';

  clearReelGlows();
  confettiDiv.innerHTML = '';
  setStatus('Pressione GIRAR para começar!', 'info');
  updateUI();
  updatePlayCounter();
  updateHistoryPanel();
  initReels();

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ──────────────────────────────────────────────────
   EVENT LISTENERS
────────────────────────────────────────────────── */
spinBtn.addEventListener('click',       doSpin);
q('betDown').addEventListener('click',  () => changeBet(-1));
q('betUp').addEventListener('click',    () => changeBet(+1));
q('closeWinBtn').addEventListener('click',    closeWinModal);
q('closeRetainBtn').addEventListener('click', closeRetainModal);
q('closeGameOverBtn').addEventListener('click', closeGameOverModal);
restartBtn.addEventListener('click',    restart);
awRestartBtn.addEventListener('click',  restart);

// Saque: sempre bloqueado enquanto o jogo está ativo
withdrawBtn.addEventListener('click', () => {
  if (!G.gameOver) openRetainModal();
});

// Fechar modais clicando fora
winOverlay.addEventListener('click',    e => { if(e.target===winOverlay)    closeWinModal(); });
retainOverlay.addEventListener('click', e => { if(e.target===retainOverlay) closeRetainModal(); });
gameOverOverlay.addEventListener('click', e => { if(e.target===gameOverOverlay) closeGameOverModal(); });

/* ──────────────────────────────────────────────────
   INIT
────────────────────────────────────────────────── */
function init() {
  initReels();
  updateUI();
  updatePlayCounter();
}
init();
