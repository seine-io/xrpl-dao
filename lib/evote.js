
/** 
 * Gui controllers
 *
*/

const proposalTitleDiv = document.getElementById("proposalTitle");
const proposalResolutionDiv = document.getElementById("proposalResolution");
document.getElementById("organizer1Seed").addEventListener('change', ()=>{ 
  let seed = document.getElementById("organizer1Seed").value;
  setWalletSeed(0,seed);
});
document.getElementById("organizer2Seed").addEventListener('change', ()=>{ 
  let seed = document.getElementById("organizer2Seed").value;
  setWalletSeed(1,seed);
});
document.getElementById("startVoteButton").addEventListener('click', startVote);
document.getElementById("endVoteButton").addEventListener('click', endVote);
document.getElementById("startTallyButton").addEventListener('click', startTally);
document.getElementById("publishResultButton").addEventListener('click', publishResult);\

function startVote(){
 //no participant can register anymore
 //check there are at least one participant   
}


function endVote(){
    //no participant can vote anymore
    //check there are at least one vote
}

function startTally(){
    //organiser aggregate result and pubish result and proof
    //main organiser create a transaction with the result in XRPL
}

function publishResult(){
    //check the blockchain for result
}