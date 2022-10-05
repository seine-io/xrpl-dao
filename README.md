# xrpl-dao
DAO zk-rollup proof of concept on XRPL

This repository contains the exploring code to implement a voting solution on [XRPL](https://xrpl.org)

## Voting process
We assume that a set of `N` (N>2) organizers have devices, for instance servers, running the offchain data (vote resolutions, ...) 
and handle collectively the voting process. Each organizer is assigned an index `i in [0,...,N[`.
Each organiser has an XRPL account.

A resolution is a single yes/no question that has a start and end voting date. 

The oganizers deliver to each participant a voter private key and public key. 
Participants are separated into N groups where N is the number of organizers.
Each organizer independently generate voters key for the participant batch corresponding to its index.
It then publish the list of its voters public key.

Each participant retrieves its voter key pair from the organiser they belong to, we call `I` the index of its organizer.

When the vote starts, the participant sends a vote transaction including the resolution id, his vote and his voter public key
to the organizer with index `(I+1) % N`. This transaction is signed with the voter private key and encrypted with organizer `I+1` public key.

The organizer `I+1` notifies organizer `I` that he received the vote, and organizer `I` publish that the voter with given public key has voted.

When the voting ends, each organizer organizes the votes it received by voter id, compute the sum of the votes and produce a stark proof of the computation.
He then publishes the result of the computation and its proof.
The organisers then create a multi signed transaction(s) on XRPL that register both the global result of the vote and the hash of the proofs. 

