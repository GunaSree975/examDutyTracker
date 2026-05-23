const mongoose = require('mongoose');
require('dotenv').config();

async function cleanup() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');
  
  try {
    await mongoose.connection.db.collection('duties').dropIndexes();
    console.log('Dropped all indexes on duties collection');
  } catch (e) {
    console.log('Collection or indexes might not exist');
  }
  
  await mongoose.connection.close();
}

cleanup().catch(err => console.error(err));
