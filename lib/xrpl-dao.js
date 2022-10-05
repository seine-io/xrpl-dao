const api = new xrpl.Client('wss://xrplcluster.com');
const ledgerPanel = document.getElementById("ledgerPanel");
var ledgerCount = 0;
const ledgerMaxCount = 5;
var lastLedgerIndex = 0;

async function getValidatedLedger(api){
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
    let time = response.result.ledger.close_time_human;
    ledgerPanel.innerHTML = "<span>["+response.result.ledger.ledger_index+"] "+time.substring(0,time.lastIndexOf("."))+"</span><br/>\n"+truncatedContent;
  }
  setTimeout(() => {
    getValidatedLedger(api);
  }, 2000);
}

async function main() {
  await api.connect();
  getValidatedLedger(api);
}

main();
