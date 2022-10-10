// I got this by insepecting https://www.cairo-lang.org/playground/
const PLAYGROUND_SERVICE_URL="https://2uuf49xjkk.execute-api.us-east-2.amazonaws.com/prod/cairo";
const SHARP_SERVICE_URL = "https://ropsten-v1.provingservice.io";

const provider = new Provider({
    sequencer: { 
      network: "goerli-alpha"
    } 
  });

function proveWithSharp(program){

      
}