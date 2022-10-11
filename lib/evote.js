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
    REGISTERED:"Registered",
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
var organiserTallyResult = [{},{}];

/** 
 * Gui controllers
 *
*/

const proposalIdSpan = document.getElementById("proposalId");
const proposalTitleDiv = document.getElementById("proposalTitle");
const proposalStatusDiv = document.getElementById("proposalStatus");
const proposalStatus2Div = document.getElementById("proposalStatus2");

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

function updateProposalStatus(status){
    proposal.status=status;
    proposalStatusDiv.innerHTML=proposal.status;
    if(status == ProposalStatus.ACCEPTED){
        proposalStatus2Div.innerHTML="v";
    } else if(status == ProposalStatus.REFUSED){
        proposalStatus2Div.innerHTML="x";
    } else {
        proposalStatus2Div.innerHTML="?";
    }
}

async function startRegistration(){
    if(proposal.status==ProposalStatus.IN_WRITING){
         //no participant can register anymore
         //check there are at least one participant   
         let serializedForm=serializeProposal(proposal);
         console.log("serializedForm="+serializedForm);
         let hash = await sha256(serializedForm);
         proposal.wallet = xrpl.Wallet.fromEntropy(new TextEncoder().encode(hash));
         proposal.id = proposal.wallet.address;
         proposalIdSpan.innerHTML=proposal.id;
         let result = registerProposalToOrganiser(proposal);
         if(result){
            updateProposalStatus(ProposalStatus.REGISTRATION_OPEN);
            document.getElementById("startRegistrationButton").disabled=true;
            document.getElementById("startVoteButton").disabled=false;
            document.getElementById("addVoter").disabled=false;
            document.getElementById("proposalTitle").innerHTML="Ongoing Proposal: <span style='color:blanchedalmond'>"+ proposal.title+"</span>";
         }
    }
}

function voteChoose(index,value){
    console.log("voter "+index+" vote:"+value);
    let voter = voters[index-1];
    if(voter.vote==null && voter.status==VoterStatus.TO_VOTE){
        voter.vote=value;
    } else {
        alert("this voter already voted.");
    }
    voter.status=VoterStatus.VOTED;
    updateVoterDiv(voter);
    renderOrganiserVoters(voter.index%2);
}

function updateVoterDiv(voter){
    let voterDiv = document.getElementById(voter.divId);
    let content = "Voter "+voter.index+"<br>\n";
    if(voter.wallet){
        content+="id: "+voter.wallet.address+"<br>\n";
    }
    content+="Status:"+voter.status+"<br></div>\n";
    if(voter.status==VoterStatus.TO_VOTE){
        content += "<span>Proposal : "+voter.proposal.title+"</span><br>";
        content += "<input type='button' onclick='voteChoose("+voter.index+",true)' value='Agree'>"
        content += "<input type='button' onclick='voteChoose("+voter.index+",false)' value='Against' style='background-color:#E64C65'>"
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
    voter.status=VoterStatus.REGISTERED;
    organiserRegisteredVoters[organizerId].push(voter);
    renderOrganiserVoters(organizerId);
    updateVoterDiv(voter);
}

function addVoter(){
  let voter = new Voter();
  voters.push(voter);
  let voterDiv = document.createElement("div");
  voterDiv.id=voter.divId;
  voterDiv.classList.add('blockpad');
  voterDiv.classList.add('voterPanel');
  voterDiv.innerHTML="Creating voter...";
  document.getElementById("votersPanel").appendChild(voterDiv);
  updateVoterDiv(voter);
  registerVoterToOrganiser(voter);
}

async function tallyVote(organizerId){
    transactionPanel.innerHTML="<p>Organizer "+organizerId+" is starting to tally</p>\n"+transactionPanel.innerHTML;
    organiserTallyResult[organizerId]={
        proposal:proposal.id,
        nbVoters:organiserRegisteredVoters[organizerId].length,
        agree:0,
        against:0
    }
    //TODO: replace that by call to cairo code on server side
    organiserRegisteredVoters[organizerId].forEach(voter=>{
        if(voter.vote===true){
            organiserTallyResult[organizerId].agree++;
        } else if (voter.vote===false){
            organiserTallyResult[organizerId].against++;
        }
    });
    organiserTallyResult[organizerId].proof=await sha256(proposal.id+organizerId+window.performance.now());
    transactionPanel.innerHTML="<p>Organizer "+(organizerId+1)+" finished tally: "+JSON.stringify(organiserTallyResult[organizerId])+
    "</p><a href='https://www.cairo-lang.org/playground/sharp.html?job_key=8b381d65-4925-4589-8800-5889b54de51c&program_hash=0x049a748653632ec760b53cb9830fb30e989b6a12fc8e15345fcb3ebfa79cf376&fact=0xf6fe2af6e4ec2f4247e9d536e0b79c2b64538d9da58c7fc9f8417e8ecfdf58c9'>proof</a>\n"+transactionPanel.innerHTML;
}

function startVote(){
    if(proposal.status==ProposalStatus.REGISTRATION_OPEN){
        if(voters.length<2){
            alert("Please add more voters first.");
            return;
        }
         //no participant can register anymore
         //check there are at least one participant   
         updateProposalStatus(ProposalStatus.IN_VOTE);
         document.getElementById("startVoteButton").disabled=true;
         document.getElementById("startTallyButton").disabled=false;
         document.getElementById("addVoter").disabled=true;
         voters.forEach(voter => {
            voter.status=VoterStatus.TO_VOTE;
            updateVoterDiv(voter);
        });
        renderOrganiserVoters(0);
        renderOrganiserVoters(1);
    }
}


function startTally(){
    if(proposal.status==ProposalStatus.IN_VOTE){ 
        //no participant can vote anymore
        //check there are at least one vote
        //organiser aggregate result and pubish result and proof
       //main organiser create a transaction with the result in XRPL
        tallyVote(0);
        tallyVote(1);
        updateProposalStatus(ProposalStatus.TALLYING);
        document.getElementById("startTallyButton").disabled=true;
        document.getElementById("publishResultButton").disabled=false;
    }
}

function publishResult(){
    //check the blockchain for result
    if(proposal.status==ProposalStatus.TALLYING){
        transactionPanel.innerHTML="<p>Organizer 1 received the results from organizer 2</p>\n"+transactionPanel.innerHTML;
        organiserTallyResult[0].nbVoters+=organiserTallyResult[1].nbVoters;
        organiserTallyResult[0].agree+=organiserTallyResult[1].agree;
        organiserTallyResult[0].against+=organiserTallyResult[1].against;
        transactionPanel.innerHTML="<p>Organizer 1 computed total result: "+JSON.stringify(organiserTallyResult[0])+"</p>\n"+transactionPanel.innerHTML;
        transactionPanel.innerHTML="<p>Organizer 1 write the result in XRPL"+transactionPanel.innerHTML;
        if(organiserTallyResult[0].agree>=organiserTallyResult[0].against){
            updateProposalStatus(ProposalStatus.ACCEPTED);
        } else {
            updateProposalStatus(ProposalStatus.REFUSED);
        }
        document.getElementById("publishResultButton").disabled=true;
        writeVoteResult('{"nbVoters":'+organiserTallyResult[0].nbVoters+',"agree":'+organiserTallyResult[0].agree
            +',"against":'+organiserTallyResult[0].against+'}',organiserTallyResult[0].proof,organiserTallyResult[1].proof);
    }
}