const ProposalStatus = {
    IN_WRITING:"In writing",
    REGISTRATION_OPEN:"Registration open",
    IN_VOTE:"In vote",
    TALLYING:"Tallying",
    ACCEPTED:"Accepted",
    REFUSED:"Refused"
}

var proposal = {
    id:"",
    title:"Approve board nomination",
    resolution:"The 2022 board of directors will be composed of Alice, Bob, Charlie and David.",
    minVoteDate:"",
    maxVoteDate:"",
    applicationDate:1700000000,
    status:ProposalStatus.IN_WRITING
}

const VoterStatus = {
    TO_REGISTER:"To be registered",
    TO_VOTE:"To vote",
    VOTED:"has voted"
}

class Voter {
    constructor(){
        this.index = voters.length + 1;
        this.status = VoterStatus.TO_REGISTER;
    }

    get divId(){
        return "voter_"+this.index;
    }
}

var voters = [];

/** 
 * Gui controllers
 *
*/

const proposalIdSpan = document.getElementById("proposalId");
const proposalTitleDiv = document.getElementById("proposalTitle");
const proposalResolutionDiv = document.getElementById("proposalResolution");
document.getElementById("proposalTitle").addEventListener('change', ()=>{ 
  proposal.title = document.getElementById("proposalTitle").value;
});
document.getElementById("proposalResolution").addEventListener('change', ()=>{ 
    proposal.resolution = document.getElementById("proposalResolution").value;
});
document.getElementById("startRegistrationButton").addEventListener('click', startRegistration);
document.getElementById("startVoteButton").addEventListener('click', startVote);
document.getElementById("startTallyButton").addEventListener('click', startTally);
document.getElementById("publishResultButton").addEventListener('click', publishResult);
document.getElementById("addVoter").addEventListener('click', addVoter);
/*
*  Services
*/

async function startRegistration(){
    if(proposal.status==ProposalStatus.IN_WRITING){
         //no participant can register anymore
         //check there are at least one participant   
         let serializedForm=serializeProposal(proposal);
         console.log("serializedForm="+serializedForm);
         proposal.id= await sha256(serializedForm);
         proposalIdSpan.innerHTML=proposal.id;
         let result = registerProposalToOrganiser(proposal);
         if(result){
            proposal.status=ProposalStatus.REGISTRATION_OPEN;
            document.getElementById("startRegistrationButton").disabled=true;
            document.getElementById("startVoteButton").disabled=false;
         }
    }
}

function updateVoterDiv(voter){
    let voterDiv = document.getElementById(voter.divId);
    voterDiv.innerHTML="Voter "+voter.index+"<br>\n"+"Status:"+voter.status;
}

function addVoter(){
  let voter = new Voter();
  voters.push(voter);
  let voterDiv = document.createElement("div");
  voterDiv.id=voter.divId;
  voterDiv.classList.add('voterPanel');
  voterDiv.innerHTML="Creating voter...";
  document.getElementById("votersPanel").appendChild(voterDiv);
  updateVoterDiv(voter);
}

function startVote(){
    if(proposal.status==ProposalStatus.REGISTRATION_OPEN){
         //no participant can register anymore
         //check there are at least one participant   
         proposal.status=ProposalStatus.IN_VOTE;
         document.getElementById("startVoteButton").disabled=true;
         document.getElementById("startTallyButton").disabled=false;
    }
}


function startTally(){
    if(proposal.status==ProposalStatus.IN_VOTE){ 
        //no participant can vote anymore
        //check there are at least one vote
        //organiser aggregate result and pubish result and proof
        //main organiser create a transaction with the result in XRPL
        proposal.status=ProposalStatus.TALLYING;
        document.getElementById("startTallyButton").disabled=true;
        document.getElementById("publishResultButton").disabled=false;
    }
}

function publishResult(){
    //check the blockchain for result
    if(proposal.status==ProposalStatus.TALLYING){ 
        proposal.status=ProposalStatus.ACCEPTED;
        document.getElementById("publishResultButton").disabled=true;
    }
}