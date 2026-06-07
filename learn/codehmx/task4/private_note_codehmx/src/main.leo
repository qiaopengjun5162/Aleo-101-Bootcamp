// private_note_codehmx.aleo
//
// A small privacy project for Aleo 101 Bootcamp Task 4.
// The note state is kept inside an encrypted record. The chain only sees an
// aggregate completion count when the owner chooses to complete a note.

program private_note_codehmx.aleo {
    @noupgrade
    constructor() {}

    record PrivateNote {
        owner: address,
        note_id: u64,
        secret_hash: field,
        progress: u8,
        completed: bool,
    }

    mapping completed_total: field => u64;

    fn create_note(note_id: u64, secret_hash: field) -> PrivateNote {
        return PrivateNote {
            owner: self.signer,
            note_id: note_id,
            secret_hash: secret_hash,
            progress: 0u8,
            completed: false,
        };
    }

    fn update_progress(note: PrivateNote, new_progress: u8) -> PrivateNote {
        assert_eq(note.owner, self.signer);
        assert(new_progress <= 100u8);

        let is_completed: bool = new_progress == 100u8;
        return PrivateNote {
            owner: note.owner,
            note_id: note.note_id,
            secret_hash: note.secret_hash,
            progress: new_progress,
            completed: is_completed,
        };
    }

    fn complete_note(note: PrivateNote) -> (PrivateNote, Final) {
        assert_eq(note.owner, self.signer);

        let completed_note: PrivateNote = PrivateNote {
            owner: note.owner,
            note_id: note.note_id,
            secret_hash: note.secret_hash,
            progress: 100u8,
            completed: true,
        };

        return (completed_note, final {
            let current: u64 = completed_total.get_or_use(0field, 0u64);
            completed_total.set(0field, current + 1u64);
        });
    }

    fn reveal_progress(note: PrivateNote) -> u8 {
        assert_eq(note.owner, self.signer);
        return note.progress;
    }
}
