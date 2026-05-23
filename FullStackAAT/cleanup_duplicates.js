const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('Connected to MongoDB');

        const dutySchema = new mongoose.Schema({
            faculty_name: String,
            exam_name: String,
            exam_date: Date,
            exam_time: String,
            venue: String,
            last_updated: Date
        });
        const Duty = mongoose.model('Duty', dutySchema);

        const allDuties = await Duty.find({});
        console.log(`Found ${allDuties.length} total records.`);

        // Helper for normalization
        const toTitleCase = (str) => {
            return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
        };

        const mergedMap = new Map();

        allDuties.forEach(d => {
            const faculty = toTitleCase(d.faculty_name);
            const exam = toTitleCase(d.exam_name);
            const key = `${faculty}|${exam}`;

            // If duplicate found, keep the one with the latest last_updated or latest ID
            if (!mergedMap.has(key) || d.last_updated > mergedMap.get(key).last_updated) {
                mergedMap.set(key, {
                    faculty_name: faculty,
                    exam_name: exam,
                    exam_date: d.exam_date,
                    exam_time: d.exam_time,
                    venue: toTitleCase(d.venue),
                    last_updated: d.last_updated || new Date()
                });
            }
        });

        console.log(`Merging into ${mergedMap.size} unique duties.`);

        // Drop current collection to clear old indexes and duplicates
        try {
            await mongoose.connection.db.dropCollection('duties');
            console.log('Dropped old collection to clear indexes.');
        } catch (e) {
            console.log('Collection did not exist or already dropped.');
        }

        // Re-insert merged data
        // The server will recreate the index when it starts, but we can do it here too if needed.
        const dutiesToInsert = Array.from(mergedMap.values());
        if (dutiesToInsert.length > 0) {
            await Duty.insertMany(dutiesToInsert);
            console.log('Successfully re-inserted merged duties.');
        }

        await mongoose.disconnect();
        console.log('Done.');
    } catch (err) {
        console.error('Cleanup Error:', err);
    }
}

cleanup();
