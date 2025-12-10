/* ===== GAME.JS (compatible with index.html above) ===== */

/* ======== State & elements ======== */
const rollBtn = document.getElementById('rollBtn');
const helpBtn = document.getElementById('helpBtn');
const helpBox = document.getElementById('helpBox');
const turnIndicator = document.getElementById('turnIndicator');
const notification = document.getElementById('notification');
const cardPopup = document.getElementById('cardPopup');
const deckChanceEl = document.getElementById('deckChance');
const deckCommEl = document.getElementById('deckComm');
const getCardHint = document.getElementById('getCardHint');
const hintText = document.getElementById('hintText');

const modalBackdrop = document.getElementById('modalBackdrop');
const modalBuy = document.getElementById('modalBuy');
const modalCancel = document.getElementById('modalCancel');
const modalPropName = document.getElementById('modalPropName');
const modalPrice = document.getElementById('modalPrice');

let playerPos = 0, computerPos = 0, totalTiles = 40, isPlayerTurn = true, waitingForCard = false;
const playerToken = document.getElementById('player'), computerToken = document.getElementById('computer');
const board = document.getElementById('board');
const tiles = Array.from(document.getElementsByClassName('tile'));
const tileSize = board.offsetWidth / 11;

let owners = Array(totalTiles).fill(null);
let playerMoney = 1000, computerMoney = 1000;
const moneyP = document.getElementById('moneyP'), moneyC = document.getElementById('moneyC');
function updateMoneyUI(){ moneyP.innerText = '$'+playerMoney; moneyC.innerText = '$'+computerMoney; }
updateMoneyUI();

function shuffle(arr){ for(let i=arr.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [arr[i],arr[j]]=[arr[j],arr[i]] } }

/* ======== Cards ======== */
let chanceCards = [
  {text:'Advance to GO', action:(who)=>{ if(who==='player'){ playerPos=0; moveTokenInstant(playerToken,0,false); updateNotification('Player moves to GO'); } else { computerPos=0; moveTokenInstant(computerToken,0,false); updateNotification('Computer moves to GO'); }}},
  {text:'Pay $50', action:(who)=>{ if(who==='player'){ playerMoney-=50; updateMoneyUI(); updateNotification('Player pays $50'); } else { computerMoney-=50; updateMoneyUI(); updateNotification('Computer pays $50'); }}},
  {text:'Receive $100', action:(who)=>{ if(who==='player'){ playerMoney+=100; updateMoneyUI(); updateNotification('Player receives $100'); } else { computerMoney+=100; updateMoneyUI(); updateNotification('Computer receives $100'); }}}
];
let communityCards = [
  {text:'Receive $50', action:(who)=>{ if(who==='player'){ playerMoney+=50; updateMoneyUI(); updateNotification('Player receives $50'); } else { computerMoney+=50; updateMoneyUI(); updateNotification('Computer receives $50'); }}},
  {text:'Go to Jail', action:(who)=>{ if(who==='player'){ playerPos=30; moveTokenInstant(playerToken,30,false); updateNotification('Player goes to Jail'); } else { computerPos=30; moveTokenInstant(computerToken,30,false); updateNotification('Computer goes to Jail'); }}},
  {text:'Pay $30', action:(who)=>{ if(who==='player'){ playerMoney-=30; updateMoneyUI(); updateNotification('Player pays $30'); } else { computerMoney-=30; updateMoneyUI(); updateNotification('Computer pays $30'); }}}
];
shuffle(chanceCards); shuffle(communityCards);

let getCardAllowed = {chance:false, comm:false};
let pendingPropertyIndex = null; // for modal

/* ======== Helpers ======== */
function updateNotification(msg){ notification.innerText = msg; }
function checkBankrupt(){
  if(playerMoney <= 0){ updateNotification('Player bankrupt — Computer wins'); rollBtn.disabled = true; return true; }
  if(computerMoney <= 0){ updateNotification('Computer bankrupt — Player wins'); rollBtn.disabled = true; return true; }
  return false;
}
function getTilePosition(index){
  let row=0,col=0;
  if(index<10){row=0; col=index;}
  else if(index<19){row=index-9; col=10;}
  else if(index<29){row=10; col=28-index;}
  else{row=39-index; col=0;}
  return {top:row*tileSize, left:col*tileSize};
}

/* ======== Movement ======== */
function moveTokenInstant(token, position, triggerTile=true){
  const pos = getTilePosition(position);
  token.style.top = pos.top + 'px';
  token.style.left = pos.left + 'px';
  if(triggerTile) setTimeout(()=> handleTileByIndex(token,position), 80);
}
function moveStep(token, current, target, callback){
  if(current === target){ callback(); return; }
  const next = (current + 1) % totalTiles;
  moveTokenInstant(token, next, false);
  setTimeout(()=> moveStep(token, next, target, callback), 120);
}
function moveTokenSmooth(token, from, to, callback){ moveStep(token, from, to, callback); }

/* ======== Modal (no native confirm) ======== */
function openBuyModal(tileIndex, propName, price){
  pendingPropertyIndex = tileIndex;
  modalPropName.innerText = propName;
  modalPrice.innerText = '$' + price;
  modalBackdrop.style.display = 'flex';
  modalBackdrop.setAttribute('aria-hidden','false');
}
function closeBuyModal(){ pendingPropertyIndex = null; modalBackdrop.style.display = 'none'; modalBackdrop.setAttribute('aria-hidden','true'); }

modalCancel.addEventListener('click', ()=>{
  // player declined
  closeBuyModal();
  updateNotification('Player declined to buy');
  // allow computer to play
  if(!waitingForCard){ setTimeout(startComputerTurn, 600); }
});
modalBuy.addEventListener('click', ()=>{
  if(pendingPropertyIndex===null){ closeBuyModal(); return; }
  const t = tiles[pendingPropertyIndex];
  const price = parseInt(t.dataset.price || 0);
  if(playerMoney >= price){
    playerMoney -= price;
    owners[pendingPropertyIndex] = 'player';
    t.querySelector('.owner').style.background = 'blue';
    updateMoneyUI();
    updateNotification(`Player bought ${t.querySelector('.label')?.innerText || 'property'}`);
  } else {
    updateNotification('Not enough money');
  }
  closeBuyModal();
  if(!waitingForCard){ setTimeout(startComputerTurn, 600); }
});

/* ======== Card UI ======== */
function showCardForPlayerOrComputer(deck, who, deckEl){
  if(!deck || deck.length===0) return;
  const card = deck.shift(); deck.push(card);
  cardPopup.innerHTML=''; cardPopup.style.top = (board.getBoundingClientRect().bottom + 20) + 'px'; cardPopup.style.display='block';
  if(who === 'computer'){
    const back = document.createElement('div'); back.className='card-back'; back.style.background='red'; back.innerHTML='<div style="font-size:16px">NextPoly</div>';
    cardPopup.appendChild(back);
    setTimeout(()=>{ cardPopup.innerHTML=''; const reveal = document.createElement('div'); reveal.className='card-reveal'; reveal.innerHTML=`<div style="font-size:16px;color:red;font-weight:bold;margin-bottom:8px">NextPoly</div><div>${card.text}</div>`; cardPopup.appendChild(reveal);
      setTimeout(()=>{ card.action('computer'); cardPopup.style.display='none'; checkBankrupt(); startComputerTurnAfterCard(); },900);
    },600);
  } else {
    const zoom = document.createElement('div'); zoom.className='card-zoom'; zoom.style.borderColor='blue';
    zoom.innerHTML = `<div style="font-size:16px;color:blue;font-weight:bold;margin-bottom:8px">NextPoly</div><div>${card.text}</div><div style="font-size:12px;margin-top:8px;color:#666">Click card to close and apply</div>`;
    cardPopup.appendChild(zoom);
    // player must click to apply — this will resume computer
    cardPopup.onclick = ()=>{ card.action('player'); cardPopup.style.display='none'; cardPopup.onclick=null; waitingForCard=false; checkBankrupt(); startComputerTurnAfterCard(); };
  }
}

/* ======== Deck click (player can inspect deck anytime; but can only draw if allowed) ======== */
deckChanceEl.addEventListener('click', ()=>{
  if(getCardAllowed.chance && waitingForCard){
    getCardAllowed.chance=false; hideGetCardHint(); showCardForPlayerOrComputer(chanceCards,'player',deckChanceEl);
  } else {
    // quick peek
    const back = document.createElement('div'); back.className='card-back'; back.style.background='blue'; back.innerHTML='<div style="font-size:16px">NextPoly</div>';
    cardPopup.innerHTML=''; cardPopup.appendChild(back); cardPopup.style.top = (board.getBoundingClientRect().bottom + 10) + 'px'; cardPopup.style.display='block'; setTimeout(()=>cardPopup.style.display='none',700);
  }
});
deckCommEl.addEventListener('click', ()=>{
  if(getCardAllowed.comm && waitingForCard){
    getCardAllowed.comm=false; hideGetCardHint(); showCardForPlayerOrComputer(communityCards,'player',deckCommEl);
  } else {
    const back = document.createElement('div'); back.className='card-back'; back.style.background='red'; back.innerHTML='<div style="font-size:16px">NextPoly</div>';
    cardPopup.innerHTML=''; cardPopup.appendChild(back); cardPopup.style.top = (board.getBoundingClientRect().bottom + 10) + 'px'; cardPopup.style.display='block'; setTimeout(()=>cardPopup.style.display='none',700);
  }
});
function showGetCardHint(text){ hintText.innerText = text; getCardHint.style.display = 'block'; }
function hideGetCardHint(){ hintText.innerText=''; getCardHint.style.display='none'; }

/* ======== Tile handling & mapping ======== */
function handleTileByIndex(token, index){
  // reset get-card unless set by tile
  getCardAllowed.chance=false; getCardAllowed.comm=false; hideGetCardHint();

  switch(index){
    case 0: handleGO(token); break;
    case 1: handleProperty(token,1); break;
    case 2: handleChance(token); break;
    case 3: handleProperty(token,2); break;
    case 4: handleTax(token); break;
    case 5: handleRail(token,1); break;
    case 6: handleProperty(token,3); break;
    case 7: handleCommunity(token); break;
    case 8: handleProperty(token,4); break;
    case 9: handleJailVisit(token); break;

    case 10: handleProperty(token,5); break;
    case 11: handleChance(token); break;
    case 12: handleProperty(token,6); break;
    case 13: handleProperty(token,7); break;
    case 14: handleRail(token,2); break;
    case 15: handleProperty(token,8); break;
    case 16: handleCommunity(token); break;
    case 17: handleProperty(token,9); break;
    case 18: handleGoToJail(token); break;
    case 19: handleExtraBonus(token); break;

    case 20: handleFree(token); break;
    case 21: handleProperty(token,10); break;
    case 22: handleChance(token); break;
    case 23: handleProperty(token,11); break;
    case 24: handleProperty(token,12); break;
    case 25: handleRail(token,3); break;
    case 26: handleProperty(token,13); break;
    case 27: handleProperty(token,14); break;
    case 28: handleProperty(token,15); break;
    case 29: handleGO(token); break;

    case 30: handleJailVisit(token); break;
    case 31: handleProperty(token,16); break;
    case 32: handleProperty(token,17); break;
    case 33: handleProperty(token,18); break;
    case 34: handleRail(token,4); break;
    case 35: handleProperty(token,19); break;
    case 36: handleCommunity(token); break;
    case 37: handleProperty(token,20); break;
    case 38: handleTax(token); break;
    case 39: handleExtraBonus(token); break;

    default: updateNotification('Unknown tile'); break;
  }
}

/* ======== Individual handlers ======== */
function handleGO(token){
  const bonus=200;
  if(token===playerToken){ playerMoney+=bonus; updateMoneyUI(); updateNotification('Player collects $200'); }
  else { computerMoney+=bonus; updateMoneyUI(); updateNotification('Computer collects $200'); }
  checkBankrupt();
}
function handleProperty(token,propNum){
  const index = findIndexByPropertyNumber(propNum);
  if(index===-1){ updateNotification('Property mapping error'); return; }
  const tileEl = tiles[index];
  const price = parseInt(tileEl.dataset.price || 0);

  if(!owners[index]){
    if(token===playerToken){
      // open our custom modal (no native confirm)
      openBuyModal(index, tileEl.querySelector('.label')?.innerText || `Pro${propNum}`, price);
      // keep computer waiting until modal resolved
      waitingForCard = false;
    } else {
      // simple AI decision
      if(computerMoney>=price && computerMoney - price >= 200){
        computerMoney -= price;
        owners[index] = 'computer';
        tileEl.querySelector('.owner').style.background = 'red';
        updateMoneyUI(); updateNotification(`Computer bought ${tileEl.querySelector('.label')?.innerText || 'property'}`);
      } else {
        updateNotification('Computer declined to buy');
      }
    }
  } else if(owners[index] !== (token===playerToken?'player':'computer')){
    const rent = Math.max(50, Math.round(price*0.25));
    if(token===playerToken){ playerMoney-=rent; computerMoney+=rent; updateNotification(`Player pays rent $${rent}`); }
    else { computerMoney-=rent; playerMoney+=rent; updateNotification(`Computer pays rent $${rent}`); }
    updateMoneyUI(); checkBankrupt();
  } else updateNotification('You own this property');
}
function handleChance(token){
  if(token===playerToken){ getCardAllowed.chance=true; waitingForCard=true; showGetCardHint('Take Your Card!'); updateNotification('Landed on Chance — click Chance deck'); }
  else showCardForPlayerOrComputer(chanceCards,'computer',deckChanceEl);
}
function handleCommunity(token){
  if(token===playerToken){ getCardAllowed.comm=true; waitingForCard=true; showGetCardHint('Take Your Card!'); updateNotification('Landed on Community — click Community deck'); }
  else showCardForPlayerOrComputer(communityCards,'computer',deckCommEl);
}
function handleTax(token){
  const tax=200;
  if(token===playerToken){ playerMoney-=tax; updateNotification(`Player pays tax $${tax}`); } else { computerMoney-=tax; updateNotification(`Computer pays tax $${tax}`); }
  updateMoneyUI(); checkBankrupt();
}
function handleRail(token,railNum){
  const index=findRailIndex(railNum);
  if(!owners[index]){
    const price=200;
    if(token===playerToken){
      openBuyModal(index, tiles[index].querySelector('.label')?.innerText || `Rail${railNum}`, price);
    } else {
      if(computerMoney>=price && computerMoney-price>=200){ computerMoney-=price; owners[index]='computer'; tiles[index].querySelector('.owner').style.background='red'; updateMoneyUI(); updateNotification(`Computer bought Rail${railNum}`); } else updateNotification('Computer declined to buy rail');
    }
  } else if(owners[index] !== (token===playerToken?'player':'computer')){
    const rent=100;
    if(token===playerToken){ playerMoney-=rent; computerMoney+=rent; updateNotification(`Player pays rail rent $${rent}`);} else { computerMoney-=rent; playerMoney+=rent; updateNotification(`Computer pays rail rent $${rent}`);}
    updateMoneyUI(); checkBankrupt();
  } else updateNotification('You own this rail');
}
function handleFree(token){ updateNotification('Free Parking — nothing happens'); }
function handleJailVisit(token){ updateNotification('Jail (visiting) — no penalty'); }
function handleGoToJail(token){
  updateNotification('Go to Jail! Sending to Jail...');
  if(token===playerToken){ playerPos=30; moveTokenInstant(playerToken,30,false); } else { computerPos=30; moveTokenInstant(computerToken,30,false); }
}
function handleExtraBonus(token){
  const bonus=100;
  if(token===playerToken){ playerMoney+=bonus; updateNotification(`Player receives Extra bonus $${bonus}`); } else { computerMoney+=bonus; updateNotification(`Computer receives Extra bonus $${bonus}`); }
  updateMoneyUI(); checkBankrupt();
}

/* ======== Utility maps ======== */
function findIndexByPropertyNumber(n){
  const map={1:1,2:3,3:6,4:8,5:10,6:12,7:13,8:15,9:17,10:21,11:23,12:24,13:26,14:27,15:28,16:31,17:32,18:33,19:35,20:37};
  return map[n] ?? -1;
}
function getPriceForProperty(n){
  const priceMap={1:60,2:60,3:100,4:100,5:140,6:140,7:160,8:180,9:200,10:220,11:220,12:240,13:260,14:260,15:280,16:300,17:300,18:320,19:350,20:400};
  return priceMap[n] ?? 100;
}
function findRailIndex(r){ const map={1:5,2:14,3:25,4:34}; return map[r] ?? -1; }

/* ======== Turn system ======== */
rollBtn.addEventListener('click', ()=>{
  if(!isPlayerTurn || rollBtn.disabled || waitingForCard) return;
  const dice = Math.floor(Math.random()*6)+1;
  const target = (playerPos + dice) % totalTiles;
  moveTokenSmooth(playerToken, playerPos, target, ()=>{
    playerPos = target;
    handleTileByIndex(playerToken, playerPos);
    if(checkBankrupt()) return;
    // if player landed on card and waitingForCard is true, do NOT start computer
    if(!waitingForCard){
      isPlayerTurn=false;
      setTimeout(startComputerTurn,800);
    } else {
      // keep turn indicator showing player until they take card
      turnIndicator.innerText = 'Turn: Player (take card)';
    }
  });
});

function startComputerTurn(){
  turnIndicator.innerText='Turn: Computer';
  isPlayerTurn=false;
  // small delay then move
  setTimeout(()=> {
    const cdice=Math.floor(Math.random()*6)+1;
    const ctarget=(computerPos+cdice)%totalTiles;
    moveTokenSmooth(computerToken, computerPos, ctarget, ()=>{
      computerPos=ctarget;
      handleTileByIndex(computerToken, computerPos);
      checkBankrupt();
      // If computer landed on card that requires player action, it's computer's card so it will reveal immediately.
      if(!waitingForCard){ turnIndicator.innerText='Turn: Player'; isPlayerTurn=true; }
    });
  }, 400);
}
function startComputerTurnAfterCard(){
  // called after card reveal
  if(!waitingForCard){
    setTimeout(startComputerTurn, 500);
  }
}

/* ======== Help ======== */
helpBtn && helpBtn.addEventListener('click', ()=>{ helpBox.style.display = helpBox.style.display==='none' ? 'block' : 'none'; });

/* ======== Init positions ======== */
moveTokenInstant(playerToken,0,false); moveTokenInstant(computerToken,0,false);
