import private_note_codehmx.aleo;

program test_private_note_codehmx.aleo {
    @test
    fn test_create_update_and_reveal() {
        let note: private_note_codehmx.aleo::PrivateNote = private_note_codehmx.aleo::create_note(1u64, 123field);
        let updated: private_note_codehmx.aleo::PrivateNote = private_note_codehmx.aleo::update_progress(note, 60u8);
        let progress: u8 = private_note_codehmx.aleo::reveal_progress(updated);

        assert_eq(progress, 60u8);
    }

    @test
    fn test_complete_note() {
        let note: private_note_codehmx.aleo::PrivateNote = private_note_codehmx.aleo::create_note(2u64, 456field);
        let (completed, f): (private_note_codehmx.aleo::PrivateNote, Final) = private_note_codehmx.aleo::complete_note(note);

        assert_eq(completed.completed, true);
        assert_eq(completed.progress, 100u8);
    }

    @noupgrade
    constructor() {}
}
