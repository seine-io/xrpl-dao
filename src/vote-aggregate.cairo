%builtins output pedersen ecdsa

from starkware.cairo.common.dict import dict_squash
from starkware.cairo.common.small_merkle_tree import (
    small_merkle_tree_update,
)
from starkware.cairo.common.alloc import alloc
from starkware.cairo.common.cairo_builtins import (
    HashBuiltin,
    SignatureBuiltin,
)
from starkware.cairo.common.hash import hash2
from starkware.cairo.common.signature import (
    verify_ecdsa_signature,
)
from starkware.cairo.common.dict import dict_update
from starkware.cairo.common.math import assert_not_zero

// Structures

struct Vote {
    // ID of the voter.
    id: felt,
    // Proposal vote (0 or 1).
    vote: felt,
    // The ECDSA signature (r and s).
    r: felt,
    s: felt,
}

struct Tally {
    n_yes_votes: felt,
    n_no_votes: felt,
}


// Functions

// Returns a list of Vote instances representing the votes.
// The validity of the returned data is not guaranteed and must
// be verified by the caller.
func get_input_votes() -> (votes: Vote*, n: felt) {
    alloc_locals;
    local n;
    let (votes: Vote*) = alloc();
    %{
        ids.n = 3
        # vote 1
        base_addr = ids.votes.address_ + ids.Vote.SIZE * 0
        memory[base_addr + ids.Vote.id] = 798472886190004179001673494155360729135078329522332065779728082154055368978
        memory[base_addr + ids.Vote.vote] = 0
        memory[base_addr + ids.Vote.r] = 1394045730609755275204945892022168241896369684819680543648182251960299174333
        memory[base_addr + ids.Vote.s] = 2312628419225786153522343961806886205618484797066467916097489119070358797988
        # vote 2
        base_addr = ids.votes.address_ + ids.Vote.SIZE * 2
        memory[base_addr + ids.Vote.id] = 965622539618741639684405678770953753815496707531483492053037473521675738736
        memory[base_addr + ids.Vote.vote] = 1
        memory[base_addr + ids.Vote.r] = 2438345696888150905637229442658962894895271665287128052020134696652289581494
        memory[base_addr + ids.Vote.s] = 3185397669875997670954206021695774354609748369869992366530894180389602813970
        # vote 3
        base_addr = ids.votes.address_ + ids.Vote.SIZE * 3
        memory[base_addr + ids.Vote.id] = 965384960948470991385524862070654437056338373192165685379947634633732412493
        memory[base_addr + ids.Vote.vote] = 0
        memory[base_addr + ids.Vote.r] = 658345088544526737150512639337329835484066869451869627084756644911508534837
        memory[base_addr + ids.Vote.s] = 1403840558212893204060871907742836907944719691930229228898003453545123628738
    %}
    return (votes=votes, n=n);
}

// The ID of the proposal the user's are voting for.
// It is replace by the organiser when tallying.
// It is also part of the voter's signature.
const PROPOSAL_ID = 10018;

func verify_vote_signature{
    pedersen_ptr: HashBuiltin*, ecdsa_ptr: SignatureBuiltin*
}(vote_ptr: Vote*) {
    let (message) = hash2{hash_ptr=pedersen_ptr}(
        x=PROPOSAL_ID, y=vote_ptr.vote
    );

    verify_ecdsa_signature(
        message=message,
        public_key=vote_ptr.id,
        signature_r=vote_ptr.r,
        signature_s=vote_ptr.s,
    );
    return ();
}


func init_tally() -> (tally: Tally) {
    alloc_locals;
    local tally: Tally;
    assert tally.n_yes_votes = 0;
    assert tally.n_no_votes = 0;
    return (tally=tally);
}

func process_vote{
    pedersen_ptr: HashBuiltin*,
    ecdsa_ptr: SignatureBuiltin*,
    tally: Tally,
}(vote_ptr: Vote*) {
    alloc_locals;

    // Verify that pub_key != 0.
    assert_not_zero(vote_ptr.id);

    // Verify the signature's validity.
    verify_vote_signature(vote_ptr=vote_ptr);

    // Generate the new tally.
    local new_tally: Tally;

    // Update the counters.
    tempvar vote = vote_ptr.vote;
    if (vote == 0) {
        // Vote "No".
        assert new_tally.n_yes_votes = tally.n_yes_votes;
        assert new_tally.n_no_votes = tally.n_no_votes + 1;
    } else {
        // Make sure that in this case vote=1.
        assert vote = 1;

        // Vote "Yes".
        assert new_tally.n_yes_votes = tally.n_yes_votes + 1;
        assert new_tally.n_no_votes = tally.n_no_votes;
    }

    // Update the tally.
    let tally = new_tally;
    return ();
}

// tally the votes by recursively processing each vote
func tally_votes{
    pedersen_ptr: HashBuiltin*,
    ecdsa_ptr: SignatureBuiltin*,
    tally: Tally,
}(votes: Vote*, n_votes: felt) {
    if (n_votes == 0) {
        return ();
    }

    process_vote(vote_ptr=votes);

    tally_votes(
        votes=votes + Vote.SIZE, n_votes=n_votes - 1
    );
    return ();
}

func main{
    output_ptr: felt*,
    pedersen_ptr: HashBuiltin*,
    ecdsa_ptr: SignatureBuiltin*,
}() {
    alloc_locals;

    let output = cast(output_ptr, Tally*);
    let output_ptr = output_ptr + Tally.SIZE;

    let (votes, n_votes) = get_input_votes();
    let (tally) = init_tally();
    tally_votes{tally=tally}(votes=votes, n_votes=n_votes);
    local pedersen_ptr: HashBuiltin* = pedersen_ptr;
    local ecdsa_ptr: SignatureBuiltin* = ecdsa_ptr;

    // Write the "yes" and "no" counts to the output.
    assert output.n_yes_votes = tally.n_yes_votes;
    assert output.n_no_votes = tally.n_no_votes;

    return ();
}