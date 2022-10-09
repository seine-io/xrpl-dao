

async function sign(stringMessage, privateKey){
    let signature = await window.crypto.subtle.sign(
        {
        name: "ECDSA",
        hash: {name: "SHA-256"},
        },
        privateKey,
        new TextEncoder().encode(stringMessage)
    );
    const r = signature.slice(0, 32);
    const s = signature.slice(32);
    console.log("signature:"+signature);
    console.log("r:"+r);
    console.log("s:"+s);
    return [r,s];
}

async function getStarkProof(program,input){

}