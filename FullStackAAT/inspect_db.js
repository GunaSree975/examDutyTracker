const mongoose = require('mongoose');
require('dotenv').config();

async function checkDatabase() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const dutySchema = new mongoose.Schema({
            faculty_name: String,
            exam_name: String,
            exam_date: Date,
            exam_time: String,
            venue: String
        });
        const Duty = mongoose.model('Duty', dutySchema);

        const duties = await Duty.find({});
        console.log(`Total duties found: ${duties.length}`);

        const seen = new Map();
        const duplicates = [];
        const caseInsensitiveSeen = new Map();
        const caseInsensitiveDuplicates = [];

        duties.forEach(d => {
            const key = `${d.faculty_name}|${d.exam_name}|${d.exam_date.toISOString()}`;
            if (seen.has(key)) {
                duplicates.push(d);
            } else {
                seen.set(key, d);
            }

            const ciKey = `${d.faculty_name.toLowerCase()}|${d.exam_name.toLowerCase()}|${d.exam_date.toISOString()}`;
            if (caseInsensitiveSeen.has(ciKey)) {
                caseInsensitiveDuplicates.push({ original: caseInsensitiveSeen.get(ciKey), duplicate: d });
            } else {
                caseInsensitiveSeen.set(ciKey, d);
            }
        });

        if (duplicates.length > 0) {
            console.log(`Found ${duplicates.length} exact duplicates!`);
            duplicates.forEach(d => {
                console.log(`- ${d.faculty_name} | ${d.exam_name} | ${d.exam_date.toISOString()}`);
            });
        } else {
            console.log('No exact duplicates found.');
        }

        if (caseInsensitiveDuplicates.length > 0) {
            console.log(`Found ${caseInsensitiveDuplicates.length} case-insensitive duplicates!`);
            caseInsensitiveDuplicates.forEach(pair => {
                console.log(`- Original: "${pair.original.faculty_name}" | Duplicate: "${pair.duplicate.faculty_name}" | Exam: ${pair.original.exam_name} | Date: ${pair.original.exam_date.toISOString()}`);
            });
        } else {
            console.log('No case-insensitive duplicates found.');
        }

        console.log("\nFull Database Content:");
        duties.forEach(d => {
            console.log(`[${d._id}] ${d.faculty_name} | ${d.exam_name} | ${d.exam_date.toISOString()} | ${d.exam_time} | ${d.venue}`);
        });

        // Check the unique index status on the collection
        const indexes = await mongoose.connection.db.collection('duties').indexes();
        console.log('Indexes on "duties" collection:');
        console.log(JSON.stringify(indexes, null, 2));

        await mongoose.disconnect();
    } catch (err) {
        console.error('Error:', err);
    }
}

checkDatabase();
