use dep::aztec::macros::aztec;

/// A simple Counter contract for learning Aztec fundamentals
#[aztec]
pub contract Counter {
    use dep::aztec::{
        macros::{
            functions::{public, initializer},
            storage::storage,
        },
        protocol_types::address::AztecAddress,
        state_vars::PublicMutable,
    };

    // STORAGE
    #[storage]
    struct Storage<Context> {
        public_count: PublicMutable<u64, Context>,
        admin: PublicMutable<AztecAddress, Context>,
    }

    // CONSTRUCTOR
    #[public]
    #[initializer]
    fn constructor(admin: AztecAddress) {
        storage.admin.write(admin);
        storage.public_count.write(0);
    }

    // PUBLIC FUNCTIONS
    #[public]
    fn increment() {
        let current = storage.public_count.read();
        storage.public_count.write(current + 1);
    }

    #[public]
    fn get_count() -> u64 {
        storage.public_count.read()
    }

    #[public]
    fn reset() {
        let admin = storage.admin.read();
        assert(context.msg_sender() == admin, "Only admin");
        storage.public_count.write(0);
    }
}
