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
    use dep::std;
    use dep::wormhole::Wormhole;
    use dep::token::Token;

    // Flattened struct to avoid serialization overhead and ensure correct proof size
    #[derive(Serialize, Deserialize)]
    pub struct ContractProofData {
        // Vkeys - 640 fields total (5 x 128)
        vkey_a: [Field; 128],
        vkey_b: [Field; 128],
        vkey_c: [Field; 128],
        vkey_d: [Field; 128],
        vkey_e: [Field; 128],
        // Proofs - 2280 fields total (5 x 456)
        proof_a: [Field; 456],
        proof_b: [Field; 456],
        proof_c: [Field; 456],
        proof_d: [Field; 456],
        proof_e: [Field; 456],
        // Vkey hashes - 5 fields
        vkey_hash_a: Field,
        vkey_hash_b: Field,
        vkey_hash_c: Field,
        vkey_hash_d: Field,
        vkey_hash_e: Field,
        // Public inputs - 24 fields total (2+2+10+5+5)
        input_a: [Field; 2],
        input_b: [Field; 2],
        input_c: [Field; 10],
        input_d: [Field; 5],
        input_e: [Field; 5],
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
        // 1. verify zk passport proofs (5 total)
        // proof a,b have 2 public inputs
        std::verify_proof_with_type(
            contractProofData.vkey_a,
            contractProofData.proof_a,
            contractProofData.input_a,
            contractProofData.vkey_hash_a,
            1
        );

        std::verify_proof_with_type(
            contractProofData.vkey_b,
            contractProofData.proof_b,
            contractProofData.input_b,
            contractProofData.vkey_hash_b,
            1
        );

        // proof c has 10 public inputs
        std::verify_proof_with_type(
            contractProofData.vkey_c,
            contractProofData.proof_c,
            contractProofData.input_c,
            contractProofData.vkey_hash_c,
            1
        );

        // proof d,e have 5 public inputs
        std::verify_proof_with_type(
            contractProofData.vkey_d,
            contractProofData.proof_d,
            contractProofData.input_d,
            contractProofData.vkey_hash_d,
            1
        );

        std::verify_proof_with_type(
            contractProofData.vkey_e,
            contractProofData.proof_e,
            contractProofData.input_e,
            contractProofData.vkey_hash_e,
            1
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
            2, // message_fee: u128
            2, // consistency: u8
            context.msg_sender().unwrap(), // from: AztecAddress
            nonce, // token_nonce: Field
        ).call(&mut context);
    }
}