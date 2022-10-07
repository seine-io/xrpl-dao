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
        this.proposal = proposal;
        this.vote = null;
    }

    get divId(){
        return "voter_"+this.index;
    }
}

var voters = [];

var organiserRegisteredVoters = [[],[]];

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
            document.getElementById("addVoter").disabled=false;
         }
    }
}

function voteChoose(index,value){
 console.log("voter "+index+" vote:"+value);
}

function updateVoterDiv(voter){
    let voterDiv = document.getElementById(voter.divId);
    let content = "Voter "+voter.index+"<br>\n"+"Status:"+voter.status+"<br>\n";
    if(voter.status==VoterStatus.TO_VOTE){
        content += "<span>Proposal : "+voter.proposal.title+"</span><br>";
        content += "<input type='button' onclick='voteChoose("+voter.index+",true)' value='Agree'>"
        content += "<input type='button' onclick='voteChoose("+voter.index+",false)' value='Against'>"
    }
    voterDiv.innerHTML=content;
}

function renderOrganiserVoters(organizerId){
    let div=document.getElementById("organizer"+(organizerId+1)+"Voters");
    let content = "<table><hr><td>voter index<br> (private info)</td><td>Voter id</td><td>status</td></hr>\n";
    organiserRegisteredVoters[organizerId].forEach(voter => { 
        content+="<tr><td>"+voter.index+"</td><td>"+voter.wallet.address+"</td><td>"+voter.status+"</td></tr>\n";
    });
    content+="</table>";
    div.innerHTML=content;
}


async function registerVoterToOrganiser(voter){
    let organizerId = voter.index % 2;
    let entropy = await sha256(proposal.id+"_voter_"+voter.index);
    console.log("entropy: "+entropy);
    voter.wallet = xrpl.Wallet.fromEntropy(new TextEncoder().encode(entropy));
    voter.status=VoterStatus.TO_VOTE;
    organiserRegisteredVoters[organizerId].push(voter);
    renderOrganiserVoters(organizerId);
    updateVoterDiv(voter);
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
  registerVoterToOrganiser(voter);
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