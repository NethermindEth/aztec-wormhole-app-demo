use dep::aztec::macros::aztec;

#[aztec]
pub contract ZKPassportCredentialEmitter {
    use dep::aztec::{
        macros::functions::external,
        protocol_types::{
            address::AztecAddress,
            traits::{Deserialize, Serialize, FromField}
        }
    };
    use dep::bb_proof_verification::verify_ultrahonkzk_proof;
    use dep::wormhole::Wormhole;
    use dep::token::Token;

    // Nested structs for better organization (works with BB UltraHonk verification)
    #[derive(Serialize, Deserialize)]
    struct vkeys {
        vkey_a: [Field; 115],
        vkey_b: [Field; 115],
        vkey_c: [Field; 115],
        vkey_d: [Field; 115],
        vkey_e: [Field; 115],
    }

    #[derive(Serialize, Deserialize)]
    struct proofs {
        proof_a: [Field; 508],
        proof_b: [Field; 508],
        proof_c: [Field; 508],
        proof_d: [Field; 508],
        proof_e: [Field; 508],
    }

    #[derive(Serialize, Deserialize)]
    struct public_inputs {
        input_a: [Field; 2],
        input_b: [Field; 2],
        input_c: [Field; 10],
        input_d: [Field; 5],
        input_e: [Field; 5],
    }

    #[derive(Serialize, Deserialize)]
    struct vkey_hashes {
        vkey_hash_a: Field,
        vkey_hash_b: Field,
        vkey_hash_c: Field,
        vkey_hash_d: Field,
        vkey_hash_e: Field,
    }

    #[derive(Serialize, Deserialize)]
    pub struct ContractProofData {
        vkeys: vkeys,
        proofs: proofs,
        vkey_hashes: vkey_hashes,
        public_inputs: public_inputs,
    }

    #[external("private")]
    fn verify_and_publish(
        contractProofData: ContractProofData,
        msg: [[u8;31];7], // Format: [zkDonation Arb Address, Arb chain ID, msg1, msg2, msg3, msg4, msg5]
        wormhole_address: AztecAddress,
        token_address: AztecAddress, // address of the token to be donated
        amount: u128, // amount of tokens to be donated on chosen chainID
        nonce: Field
    ) {
        // 1. verify zk passport proofs (5 total) using BB UltraHonk verification
        // proof a,b have 2 public inputs
        verify_ultrahonkzk_proof(
            contractProofData.vkeys.vkey_a,
            contractProofData.proofs.proof_a,
            contractProofData.public_inputs.input_a,
            contractProofData.vkey_hashes.vkey_hash_a
        );

        verify_ultrahonkzk_proof(
            contractProofData.vkeys.vkey_b,
            contractProofData.proofs.proof_b,
            contractProofData.public_inputs.input_b,
            contractProofData.vkey_hashes.vkey_hash_b
        );

        // proof c has 10 public inputs
        verify_ultrahonkzk_proof(
            contractProofData.vkeys.vkey_c,
            contractProofData.proofs.proof_c,
            contractProofData.public_inputs.input_c,
            contractProofData.vkey_hashes.vkey_hash_c
        );

        // proof d,e have 5 public inputs
        verify_ultrahonkzk_proof(
            contractProofData.vkeys.vkey_d,
            contractProofData.proofs.proof_d,
            contractProofData.public_inputs.input_d,
            contractProofData.vkey_hashes.vkey_hash_d
        );

        verify_ultrahonkzk_proof(
            contractProofData.vkeys.vkey_e,
            contractProofData.proofs.proof_e,
            contractProofData.public_inputs.input_e,
            contractProofData.vkey_hashes.vkey_hash_e
        );

        let bridge_address = AztecAddress::from_field(0x254e2fb335400ee94944fdc64c983934b93827bcbcc2c8f4a5090daff6582dfc); // Receiver/bridge address for token transfers

        // 2. Perform zk Donation
        let _ = Token::at(token_address).transfer_in_private(
            context.msg_sender().unwrap(),
            bridge_address, // should be set to the bridge address but for demo purposes the user can supply it
            amount,
            nonce
        ).call(&mut context);

        // 3. prepare message
        // MSG = [zkDonation Arb Address, Arb chain ID, Amount, payload]

        // Payload Field 3: Amount as [u8;31]
        // let amount_field: Field = amount as Field;
        // let payload3: [u8; 31] = amount_field.to_be_bytes();

        let amount_field: Field = amount as Field;
        let payload3: [u8; 31] = amount_field.to_le_bytes();

        // Payload Field 4-8: Message
        // The message is already in the format of 7 u8s (msg[0] through msg[6])
        // Wormhole payload: [msg[0], msg[1], payload3, msg[2], msg[3], msg[4], msg[5], msg[6]]
                
        // 4. call publish message with flat signature
        // Wormhole signature: fn publish_message_in_private_flat(nonce: u64, payload_1-8: [u8; 31], message_fee: u128, consistency: u8, from: AztecAddress, token_nonce: Field)
        let _ = Wormhole::at(wormhole_address).publish_message_in_private_flat(
            1, // nonce: u64
            msg[0], // payload_1: [u8; 31]
            msg[1], // payload_2: [u8; 31]
            payload3, // payload_3: [u8; 31] (amount)
            msg[2], // payload_4: [u8; 31]
            msg[3], // payload_5: [u8; 31]
            msg[4], // payload_6: [u8; 31]
            msg[5], // payload_7: [u8; 31]
            msg[6], // payload_8: [u8; 31]
            0, // message_fee: u128
            2, // consistency: u8
            context.msg_sender().unwrap(), // from: AztecAddress
            nonce, // token_nonce: Field
        ).call(&mut context);
    }
}