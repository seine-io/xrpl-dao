var api = null;
var ledgerCount = 0;
const ledgerMaxCount = 5;
var lastLedgerIndex = 0;
var network="s.altnet.rippletest.net/";
var ledgerTimeout = null;
var organizerWallets = [null,null];
/** 
 * Gui controllers
 *
*/

const ledgerPanel = document.getElementById("ledgerPanel");
const totalSupplyDiv = document.getElementById("totalSupply");
document.getElementById("network").addEventListener('change', setNetwork);
document.getElementById("organizer1Seed").addEventListener('change', ()=>{ 
  let seed = document.getElementById("organizer1Seed").value;
  setWalletSeed(0,seed);
});
document.getElementById("organizer2Seed").addEventListener('change', ()=>{ 
  let seed = document.getElementById("organizer2Seed").value;
  setWalletSeed(1,seed);
});
document.getElementById("organizer2Address").addEventListener('change', ()=>{ 
  let address = document.getElementById("organizer2Address").value;
  organizerWallets[1].address=address;
  console.log("change address:",organizerWallets[1]);
});
document.getElementById("transferButton").addEventListener('click', performTransfer);
/** 
 * Services
 *
*/

function setNetwork(event){
  network=this.value;
  console.log("change network to "+network);
  reconnect();
}

async function setWalletSeed(index,seed){
  wallet = xrpl.Wallet.fromSeed(seed);
  console.log(wallet.address)
  document.getElementById("organizer"+(index+1)+"Address").innerHTML=wallet.address;
  organizerWallets[index]=wallet;
  /*let response = await api.request({
    "command": "account_info",
    "account": wallet.address,
    "ledger_index": "validated"
  })
  console.log(response);
  */
  let balance = await api.getXrpBalance(
    wallet.address
  );
  console.log("balance: "+balance);
  document.getElementById("organizer"+(index+1)+"Balance").innerHTML=balance;
}



async function performTransfer(){
  if(document.getElementById("originWallet").value == document.getElementById("destinationWallet").value){
    alert("the origin and destination wallets cannot be the same");
    return;
  }
  let originWallet = organizerWallets[document.getElementById("originWallet").value];
  let destinationWallet = organizerWallets[document.getElementById("destinationWallet").value];
  let amount =  document.getElementById("transferAmount").value;
  document.getElementById("transferButton").disabled=true;
  let preparedTx = await prepareTransaction(originWallet,destinationWallet,amount);
  try {
    let signed = originWallet.sign(preparedTx);
    console.log("Identifying hash:", signed.hash);
    console.log("Signed blob:", signed.tx_blob);
    tx = await api.submitAndWait(signed.tx_blob);
    console.log("\nBalance changes: " +JSON.stringify(xrpl.getBalanceChanges(tx.result.meta), null, 2));
    let balance = await api.getXrpBalance(
      originWallet.address
    );
    document.getElementById("organizer1Balance").innerHTML=balance;
    balance = await api.getXrpBalance(
      destinationWallet.address
    );
    document.getElementById("organizer2Balance").innerHTML=balance;
  } catch (error) {
    console.log(JSON.stringify(error));
  }
  document.getElementById("transferButton").disabled=false;
}

async function reconnect(){
  await disconnect();
  await connect();
}


async function disconnect(){
  console.log("deconnecting api , currently connected:"+api.isConnected());
  if(ledgerTimeout!=null){
    clearTimeout(ledgerTimeout);
    ledgerTimeout=null;
  }
  await api.disconnect();
  console.log("after disconnect , currently connected:"+api.isConnected());
  ledgerCount = 0;
  lastLedgerIndex = 0;
  ledgerPanel.innerHTML = "";
}

async function connect(){
  console.log("connecting to "+network);
  totalSupplyDiv.innerHTML="connecting to "+network;
  api = new xrpl.Client('wss://'+network);
  await api.connect();
  getValidatedLedger();
}

async function getValidatedLedger(){
  let response = await api.request({
    "command": "ledger",
    "ledger_index": "validated",
    "transactions": false
  });
  let truncatedContent = ledgerPanel.innerHTML;
  if(ledgerCount>=ledgerMaxCount){
    truncatedContent = truncatedContent.substring(0,truncatedContent.lastIndexOf("<span>"));
  } else if(response.result.ledger.ledger_index > lastLedgerIndex) {
    ledgerCount++;
  }
  if(response.result.ledger.ledger_index > lastLedgerIndex){
    lastLedgerIndex = response.result.ledger.ledger_index;
    totalSupplyDiv.innerHTML='Total XRP: '+xrpl.dropsToXrp(response.result.ledger.total_coins);
    let time = response.result.ledger.close_time_human;
    ledgerPanel.innerHTML = "<span>["+response.result.ledger.ledger_index+"] "+time.substring(0,time.lastIndexOf("."))+"</span><br/>\n"+truncatedContent;
  }
  ledgerTimeout = setTimeout(() => {
    getValidatedLedger();
  }, 2000);
}


async function prepareTransaction(originWallet,targetWallet,drops){
  let prepared = await api.autofill({
    "TransactionType": "Payment",
    "Account": originWallet.address,
    "Amount": drops,
    "Destination": targetWallet.address
  })
  const max_ledger = prepared.LastLedgerSequence
  console.log("Prepared transaction instructions:", prepared)
  console.log("Transaction cost:", xrpl.dropsToXrp(prepared.Fee), "XRP")
  console.log("Transaction expires after ledger:", max_ledger)
  return prepared;
}

async function main(){
  await connect();
  setWalletSeed(0,document.getElementById("organizer1Seed").value);
  setWalletSeed(1,document.getElementById("organizer2Seed").value);
}

main();