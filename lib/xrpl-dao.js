async function main() {
  const api = new xrpl.Client('wss://xrplcluster.com');
  await api.connect();

  let response = await api.request({
    "command": "ledger",
    "ledger_index": "validated",
    "transactions": true
  });
  console.log(response);
}
main();
