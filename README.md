# xrpl-dao
DAO zk-rollup proof of concept on XRPL

This repository contains the exploring code to implement a voting solution on [XRPL](https://xrpl.org)

## Technical design
This PoC runs in the browser and interacts with XRPL using the [xrpl javascript library](https://xrpl.org/get-started-using-javascript.html).

All the interactions between voters and organizers are performed here by function calls instead of http exchanges implemented like in this [registration example](https://github.com/seine-io/xrpl-dao/blob/5a0593f6720cf400af3733514e4b303d50e38389/lib/evote.js#L145)

There is a single HTML file exposed to [https://demo.seine.io](https://demo.seine.io) through github page via github action.

3 types of transactions are used when interacting with the blockchain :

* [Setting the Signer list](https://github.com/seine-io/xrpl-dao/blob/5a0593f6720cf400af3733514e4b303d50e38389/lib/xrpl-dao.js#L185) of the main organizer
* Potential [fund transfer between organizers](https://github.com/seine-io/xrpl-dao/blob/5a0593f6720cf400af3733514e4b303d50e38389/lib/xrpl-dao.js#L294)
* Creating multisigned transaction to [write a vote result in the chain](https://github.com/seine-io/xrpl-dao/blob/5a0593f6720cf400af3733514e4b303d50e38389/lib/xrpl-dao.js#L227).

In the settings tab, we can choose between XRPL Tesnet and Mainnet.

The [vote counting algorithm](./src/vote-aggregate.cairo) is written in [Cairo](https://www.cairo-lang.org/). 
Due to a limitation in the [starknet js library](https://github.com/0xs34n/starknet.js/issues/336), the process of creating the proof has not been automated yet.
But the idea is that the [list of voters in it](https://github.com/seine-io/xrpl-dao/blob/5a0593f6720cf400af3733514e4b303d50e38389/src/vote-aggregate.cairo#L50) is written by each organizer and the [winterfell library](https://github.com/novifinancial/winterfell) [or equivalent](https://github.com/maxgillett/giza)) is used on the organizer machine to prove the vote counting.


## Voting process
We assume that a set of `N` (N>=2) organizers have devices, for instance servers, running the offchain data (vote resolutions, ...) 
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

