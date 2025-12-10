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

/* ======== Card UI ======== */
function showCardForPlayerOrComputer(deck, who, deckEl){
  if(!deck || deck.length===0) return;
  const card = deck.shift(); deck.push(card);
  cardPopup.innerHTML=''; cardPopup.style.top = (board.getBoundingClientRect().bottom + 20) + 'px'; cardPopup.style.display='block';

  if(who === 'computer'){
    const back = document.createElement('div'); back.className='card-back'; back.style.background='red'; back.innerHTML='<div style="font-size:16px">NextPoly</div>';
    cardPopup.appendChild(back);
    setTimeout(()=>{ cardPopup.innerHTML=''; const reveal = document.createElement('div'); reveal.className='card-reveal'; reveal.innerHTML=`<div style="font-size:16px;color:red;font-weight:bold;margin-bottom:8px">NextPoly</div><div>${card.text}</div>`; cardPopup.appendChild(reveal);
      setTimeout(()=>{ card.action('computer'); cardPopup.style.display='none'; checkBankrupt(); computerTurnAfterCard(); },900);
    },600);
  } else {
    const zoom = document.createElement('div'); zoom.className='card-zoom'; zoom.style.borderColor='blue';
    zoom.innerHTML = `<div style="font-size:16px;color:blue;font-weight:bold;margin-bottom:8px">NextPoly</div><div>${card.text}</div><div style="font-size:12px;margin-top:8px;color:#666">Click card to close and apply</div>`;
    cardPopup.appendChild(zoom);
    cardPopup.onclick = ()=>{ card.action('player'); cardPopup.style.display='none'; cardPopup.onclick=null; checkBankrupt(); waitingForCard=false; computerTurnAfterCard(); };
  }
}

/* ======== Deck click ======== */
deckChanceEl.addEventListener('click', ()=>{
  if(getCardAllowed.chance && waitingForCard){
    getCardAllowed.chance=false; hideGetCardHint(); showCardForPlayerOrComputer(chanceCards,'player',deckChanceEl);
  } else {
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

/* ======== Tile handling ======== */
function handleTileByIndex(token, index){
  getCardAllowed.chance=false; getCardAllowed.comm=false; hideGetCardHint();
  waitingForCard=false;

  const tile = tiles[index];
  const type = tile.dataset.type;

  switch(type){
    case 'go': handleGO(token); break;
    case 'property': handleProperty(token,tile.dataset.prop); break;
    case 'chance': handleChance(token); break;
    case 'community': handleCommunity(token); break;
    case 'tax': handleTax(token); break;
    case 'rail': handleRail(token,tile.dataset.rail); break;
    case 'bonus': handleExtraBonus(token); break;
    case 'jail': handleJailVisit(token); break;
    case 'gojail': handleGoToJail(token); break;
    default: updateNotification('Unknown tile'); break;
  }
}

/* ======== Individual handlers ======== */
function handleGO(token){ const bonus=200; token.id==='player'?playerMoney+=bonus:computerMoney+=bonus; updateMoneyUI(); updateNotification(`${token.id==='player'?'Player':'Computer'} collects $200`); checkBankrupt(); }
function handleProperty(token,propNum){
  const index = findIndexByPropertyNumber(propNum);
  if(index===-1){ updateNotification('Property mapping error'); return; }
  if(!owners[index]){
    const price = getPriceForProperty(propNum);
    if(token.id==='player'){
      if(confirm(`Buy Pro${propNum} for $${price}?`)){
        if(playerMoney>=price){ playerMoney-=price; owners[index]='player'; tiles[index].style.background='lightblue'; updateMoneyUI(); updateNotification(`Player bought Pro${propNum}`); }
        else updateNotification('Not enough money');
      } else updateNotification('Player declined to buy');
    } else {
      if(computerMoney>=price && computerMoney - price >= 200){ computerMoney-=price; owners[index]='computer'; tiles[index].style.background='lightcoral'; updateMoneyUI(); updateNotification(`Computer bought Pro${propNum}`); }
      else updateNotification('Computer declined to buy');
    }
  } else if(owners[index] !== token.id){
    const rent = Math.max(50, Math.round(getPriceForProperty(propNum)*0.25));
    token.id==='player'?playerMoney-=rent,computerMoney+=rent:updateNotification(`Computer pays rent $${rent}`); updateMoneyUI(); checkBankrupt();
  } else updateNotification('You own this property');
}
function handleChance(token){
  if(token.id==='player'){ getCardAllowed.chance=true; waitingForCard=true; showGetCardHint('Take your card!'); updateNotification('Landed on Chance — click Chance deck'); }
  else showCardForPlayerOrComputer(chanceCards,'computer',deckChanceEl);
}
function handleCommunity(token){
  if(token.id==='player'){ getCardAllowed.comm=true; waitingForCard=true; showGetCardHint('Take your card!'); updateNotification('Landed on Community — click Community deck'); }
  else showCardForPlayerOrComputer(communityCards,'computer',deckCommEl);
}
function handleTax(token){ const tax=200; token.id==='player'?playerMoney-=tax:computerMoney-=tax; updateMoneyUI(); updateNotification(`${token.id==='player'?'Player':'Computer'} pays tax $${tax}`); checkBankrupt(); }
function handleRail(token,railNum){ const price=200; const rent=100; const index=findRailIndex(railNum);
  if(!owners[index]){
    if(token.id==='player'){ if(confirm(`Buy Rail${railNum} for $${price}?`)){ if(playerMoney>=price){ playerMoney-=price; owners[index]='player'; tiles[index].style.background='lightblue'; updateMoneyUI(); updateNotification(`Player bought Rail${railNum}`);} } }
    else { if(computerMoney>=price && computerMoney-price>=200){ computerMoney-=price; owners[index]='computer'; tiles[index].style.background='lightcoral'; updateMoneyUI(); updateNotification(`Computer bought Rail${railNum}`); } }
  } else if(owners[index] !== token.id){ token.id==='player'?playerMoney-=rent,computerMoney+=rent:computerMoney-=rent,playerMoney+=rent; updateMoneyUI(); checkBankrupt(); }
}
function handleExtraBonus(token){ const bonus=100; token.id==='player'?playerMoney+=bonus:computerMoney+=bonus; updateMoneyUI(); updateNotification(`${token.id==='player'?'Player':'Computer'} receives Extra bonus $${bonus}`); checkBankrupt(); }
function handleJailVisit(token){ updateNotification('Jail (visiting) — no penalty'); }
function handleGoToJail(token){ updateNotification('Go to Jail! Sending to Jail...'); token.id==='player'?playerPos=30:computerPos=30; moveTokenInstant(token,30,false); }

/* ======== Utility ======== */
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
    if(!waitingForCard){ isPlayerTurn=false; setTimeout(computerPlayTurn,800); }
  });
});

function computerPlayTurn(){
  const dice=Math.floor(Math.random()*6)+1; const target=(computerPos+dice)%totalTiles;
  moveTokenSmooth(computerToken, computerPos, target, ()=>{
    computerPos=target;
    handleTileByIndex(computerToken, computerPos);
    if(!waitingForCard){ turnIndicator.innerText='Turn: Player'; isPlayerTurn=true; }
  });
}

function computerTurnAfterCard(){
  if(!waitingForCard){ turnIndicator.innerText='Turn: Computer'; isPlayerTurn=false; setTimeout(computerPlayTurn,400); }
}

/* ======== Help ======== */
helpBtn.addEventListener('click', ()=>{ helpBox.style.display = helpBox.style.display==='none' ? 'block' : 'none'; });

/* ======== Init positions ======== */
moveTokenInstant(playerToken,0,false); moveTokenInstant(computerToken,0,false);
