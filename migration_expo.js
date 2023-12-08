require("dotenv").config();
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Loop old transcripts
// look up the user in old_users with session id from document
// look up the email in the new users
// if exist : update the session_id with new_users objectID
// if doesnt exist : create new user and use that userID as sessionId

async function migrateTranscripts() {

    try {

        await mongoose.connect(process.env.MONGO_URL);

        const TranscriptSchema = new Schema({
            type: Number,
            transcript: String,
            sessionId: mongoose.Schema.Types.ObjectId,
            date: Date,
        });

        const UserSchema = new Schema({
            name: String,
            email: String,
            productName: String,
            date: Date,
        });

        const TranscriptsOld = mongoose.model('old_transcript', TranscriptSchema);
        const UsersOld = mongoose.model('old_user', UserSchema);

        const Transcripts = mongoose.model('transcript', TranscriptSchema);
        const Users = mongoose.model('user', UserSchema);

        const old_transcripts = await TranscriptsOld.find({});

        for (const old_transcript of old_transcripts) {

            const sessionIdObjectId = mongoose.Types.ObjectId.createFromHexString(String(old_transcript.sessionId));

            const corresponding_user = await UsersOld.findOne({ _id: sessionIdObjectId })

            if (corresponding_user.email) {

                const existing_user_from_new = await Users.findOne({ email: corresponding_user.email })

                if (existing_user_from_new) {
                    await Transcripts.create({
                        type: old_transcript.type,
                        transcript: old_transcript.transcript,
                        sessionId: existing_user_from_new._id,
                        date: old_transcript.date
                    })
                }
                else {
                    const new_user = await Users.create({
                        name: corresponding_user.name,
                        email: corresponding_user.email,
                        productName: corresponding_user.productName,
                        date: corresponding_user.date,
                    })

                    await Transcripts.create({
                        type: old_transcript.type,
                        transcript: old_transcript.transcript,
                        sessionId: new_user._id,
                        date: old_transcript.date
                    })


                }
            }


        }

        console.log("MIGRATION COMPLETE");

        mongoose.connection.close()
        process.exit()

        
    } catch (error) {

        console.log("MIGRATION FAILED",error);

    }


}

migrateTranscripts()
