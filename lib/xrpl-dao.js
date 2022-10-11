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
const transactionPanel = document.getElementById("transactionPanel");
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
function openTab(tabName){
  let x = document.getElementsByClassName("tab");
  for (let i = 0; i < x.length; i++) {
    x[i].style.display = "none";
  }
  document.getElementsByClassName(tabName)[0].style.display = "block"; 
}
/** 
 * Services
 *
*/

async function sha256(message) {
  const utf8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
      .map((bytes) => bytes.toString(16).padStart(2, '0'))
      .join('');
  return hashHex;
}

function encode_b58(hex_number) {
  const base58 = ['r','p','s','h','n','a','f',3,9,'w','B','U','D','N','E','G','H','J',
  'K','L','M',4,'P','Q','R','S','T',7,'V','W','X','Y','Z',2,'b','c','d','e','C','g',6,5,'j',
  'k','m',8,'o','F','q','i',1,'t','u','v','A','x','y','z'];
  //const base58 = [1,2,3,4,5,6,7,8,9,'A','B','C','D','E','F','G','H','J','K','L','M','N','P','Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f','g','h','i','j','k','m','n','o','p','q','r','s','t','u','v','w','x','y','z'];
  var num = BigInt('0x' + hex_number);
  const fifty8 = BigInt(58);
  var remainder;
  var b58_encoded_buffer = '';
  while (num > 0) {
      remainder = num % fifty8;
      b58_encoded_buffer = base58[remainder] + b58_encoded_buffer;
      num = num/BigInt(58);
  }
  while ( hex_number.match(/^00/) ){
      b58_encoded_buffer = '1' + b58_encoded_buffer;
      hex_number = hex_number.substring(2);
  }
  return b58_encoded_buffer;
}

function serializeProposal(prop){
  return prop.title+"|"+prop.resolution+"|"+prop.applicationDate;
}

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
    transactionPanel.innerHTML="<p>"+JSON.stringify(tx)+"</p>\n"+transactionPanel.innerHTML;
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

async function setSignerList(wallet,signerAddresses){
  transactionPanel.innerHTML="<p> Organizer 1 is adding Organizer 2 to its signer list set</p>\n"+transactionPanel.innerHTML;
   let transac={
    "TransactionType": "SignerListSet",
    "Account": wallet.address,
    "SignerQuorum": 1,
    "SignerEntries":[]
  }
  signerAddresses.forEach(element => {
    transac.SignerEntries.push({
      "SignerEntry": {
        "Account": element,
        "SignerWeight": 1
      }
    })
  });
  let preparedTx = await api.autofill(transac)
  const max_ledger = preparedTx.LastLedgerSequence;
  console.log("Prepared SignerListSet transaction instructions:", preparedTx)
  console.log("Transaction cost:", xrpl.dropsToXrp(preparedTx.Fee), "XRP")
  console.log("Transaction expires after ledger:", max_ledger)
  try {
    let signed = wallet.sign(preparedTx);
    tx = await api.submitAndWait(signed.tx_blob);
    transactionPanel.innerHTML="<p>succes: SignerListSet transaction = "+JSON.stringify(tx)+"</p>\n"+transactionPanel.innerHTML;
    console.log("\nBalance changes: " +JSON.stringify(xrpl.getBalanceChanges(tx.result.meta), null, 2));
    let balance = await api.getXrpBalance(
      wallet.address
    );
    document.getElementById("organizer1Balance").innerHTML=balance;
  } catch (error) {
    console.log(error);
  }
}

function toHex(str){
    return Array.from(str).map(c => 
      c.charCodeAt(0) < 128 ? c.charCodeAt(0).toString(16) : 
      encodeURIComponent(c).replace(/\%/g,'').toLowerCase()
    ).join('');
}

async function writeVoteResult(result,proof1,proof2){
  
  let transacBase = {
    "TransactionType": "Payment",
    "Account": organizerWallets[0].address,
    "Amount": "10",
    "Destination": proposal.id,
    "Memos":[
      {
        "Memo":{
          "MemoType":toHex("result"),
          "MemoData":toHex(result)
        }
      },
      {
        "Memo":{
          "MemoType":toHex("proof1"),
          "MemoData":toHex(proof1)
        }
      },
      {
        "Memo":{
          "MemoType":toHex("proof2"),
          "MemoData":toHex(proof2)
        }
      }
    ]
  }
  let transac = {
    ...transacBase,
    "Fee": "300",
    "Sequence":1,
    "LastLedgerSequence":parseInt(lastLedgerIndex)+2
  }
  console.log("transac:", transac);
  try {
    let signedOrg2 = organizerWallets[1].sign(transac,true);
    console.log("tx signed by org2:", signedOrg2);
    let multisigned = xrpl.multisign([signedOrg2.tx_blob]);
    console.log("tx multisigned:", multisigned);
    tx = await api.submitAndWait(multisigned);
    transactionPanel.innerHTML="<p>succes: writeVoteResult transaction = "+JSON.stringify(tx)+"</p>\n"+transactionPanel.innerHTML;
    console.log("\nBalance changes: " +JSON.stringify(xrpl.getBalanceChanges(tx.result.meta), null, 2));
    let balance = await api.getXrpBalance(
      wallet.address
    );
    document.getElementById("organizer1Balance").innerHTML=balance;
  } catch (error) {
    console.log(error);
    transactionPanel.innerHTML="<p>Multisignature transaction failed, fallback on single transaction</p>\n"+transactionPanel.innerHTML;
    try {
      let preparedTx = await api.autofill(transacBase);
      let signed = organizerWallets[0].sign(preparedTx);
      tx = await api.submitAndWait(signed.tx_blob);
      transactionPanel.innerHTML="<p>succes: writeVoteResult transaction = "+JSON.stringify(tx)+"</p>\n"+transactionPanel.innerHTML;
      console.log("\nBalance changes: " +JSON.stringify(xrpl.getBalanceChanges(tx.result.meta), null, 2));
      let balance = await api.getXrpBalance(
        wallet.address
      );
      document.getElementById("organizer1Balance").innerHTML=balance;
    } catch (error) {
      console.log(error);
    }
  }
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

async function registerProposalToOrganiser(proposal){
  transactionPanel.innerHTML="<p> Organizer 1 Received new proposal: "+JSON.stringify(proposal)+"</p>\n"+transactionPanel.innerHTML; 
  let comptudedId = await sha256(serializeProposal(proposal));
  if(proposal.id!= xrpl.Wallet.fromEntropy(new TextEncoder().encode(comptudedId)).address){
    transactionPanel.innerHTML="<p> The proposal id is invalid, Organizer 1 refuses to register it.</p>\n"+transactionPanel.innerHTML;   
    return false;
  } 
  transactionPanel.innerHTML="<p> The proposal id is valid. Users can register</p>\n"+transactionPanel.innerHTML;  
  return true; 
}

async function main(){
  await connect();
  setWalletSeed(0,document.getElementById("organizer1Seed").value);
  setWalletSeed(1,document.getElementById("organizer2Seed").value);
  setSignerList(organizerWallets[0],[organizerWallets[1].address]);
}

main();