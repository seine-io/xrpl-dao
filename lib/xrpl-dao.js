var api = new xrpl.Client('wss://xrplcluster.com');
var ledgerCount = 0;
const ledgerMaxCount = 5;
var lastLedgerIndex = 0;
var network="xrplcluster.com";
var ledgerTimeout = null;
/** 
 * Gui controllers
 *
*/

const ledgerPanel = document.getElementById("ledgerPanel");
const totalSupplyDiv = document.getElementById("totalSupply");
document.getElementById("network").addEventListener('change', setNetwork);
/** 
 * Services
 *
*/

function setNetwork(event){
  network=this.value;
  console.log("change network to "+network);
  reconnect();
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

connect();
