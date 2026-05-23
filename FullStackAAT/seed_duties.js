const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

async function seedData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const dutySchema = new mongoose.Schema({
      faculty_name: { type: String, required: true },
      exam_name: String,
      exam_date: Date,
      exam_time: String,
      venue: String,
      notification_sent: { type: Boolean, default: false },
      last_updated: { type: Date, default: Date.now }
    });

    const Duty = mongoose.model('Duty', dutySchema);

    // Delete existing duties to start fresh for this test
    await Duty.deleteMany({});
    console.log('Cleared existing duties.');

    const facultyInput = `AIML	Prof. Kavya D N
AIML	Prof Anupama  V P
CH	Dr. B R Veena
CH	Dr. Rajani M R
CH	Prof. Shruthi S B
CS	Prof. Kavyashree K.R
CS	Prof. C Manasa
CS	Prof. Harpreet Kaur Thind
CS	Prof. Pruthvi C.N
CSD	Prof. Poornima D
CSD	Prof. Swathi BV
CSD	Prof. Nayana U Shinde
CSD	Dr. Shobha N
CV	Dr.R. SHANTI VENGADESHWARI
CV	Prof. T.P.SANJEEV
CV	Dr. DOMA HEMANTH KUMAR
CV	Prof. H.N.SRIDHAR
CV	Prof. SHAHAJI PATIL
CV	Prof. SPOORTHY S S
CV	Prof. ASHWINI SATYANARAYANA
CV	Prof. RAGHAVENDRA H N
CV	Prof. UJWAL M. S
CV	Prof. RAGHAVENDRA PRAJWAL H S
CV	Prof. HARSHITHA M
CV	Prof. SWETTI JHA
EC	Dr. M. ROOPA
EC	Dr. P. VIMALA
EC	Dr. S. THENMOZHI
EC	Dr. MANASA R.
EC	Dr.  SRIVIDYA L.
EC	Mrs. VIBHA T.G.
EC	Mrs.  KAVITA S. GUDDA
EC	Mrs.  SOUMYA P.
EC	Mrs. CHAITRA A.
EC	Mrs. ASHWINI GOWDA H B
EC	Mrs. CHANDANA.S
EC	Dr. SUMIT SWAIN
EC	Mrs. REHKA KIRSHNA
EC	Mr. ARYA SUMAN PATTNAIK
EC	Ms. SOUJANYA R
EE	Dr P B Savitha
EE	Dr Saravanakumar R
EE	Dr. Soni M
EE	Dr. Anubhav Kumar Pandey
EE	Dr. Suvetha P S
EE	Dr. Supriya J
EE	Dr. Priyanshu Kumar
EE	Dr. Sridevi H.R
EE	Dr. Jami Rajesh
EE	Prof. Satish B A
EE	Prof. Rachana M Hullamani
EIE	Prof. Anjana Joshi
EIE	Prof. Kavyashree J
EIE	Prof. Archana S
IOT	Prof. Shashank S
IOT	Prof. Keerti P
ISE	Dr. RESHMA J
ISE	Dr. PRATHIMA MABEL. J.
ISE	Prof. REKHA JAYARAM
ISE	Prof. YOGESH B S
ISE	Prof. PREETHI LOKESH
ISE	Prof. IRSHAD KHAN
ISE	Prof. MADHAVARAM SWAPNA
MAT	Dr. K.T. Shivaram
MAT	Dr. Sanjay Oli
MAT	Dr. Sowmya.K.
MAT	Dr.Rose Bindu Joseph P
MAT	Dr.Kallugudi Vari Nagamani
MAT	Dr.Amruthalakshmi M R
MAT	Dr. Noor Arshika S
MAT	Dr.Venkatesh Babu K P
MAT	Dr.Thangaraj C
MCA	Dr. Srinivasan V
MCA	Dr. R. Jayanthi
MCA	Prof. Raksha Kodnad R
MBA	Dr. Vinod Krishna
MBA	Dr. Hemantha Y
MBA	Prof. Ramya H P
MBA	Prof. Jayshree K
MD	Mr. Murigendrayya M
MD	Mr. Krishnan Bandyopadhyay
MD	Ms. Eeshika Ghosh
ME	Dr. Ningegowda. B. M
ME	Dr. M.K.Venkatesh
ME	Dr. Aruna Devi. M
ME	Dr.V. R Srinivasan
ME	Dr.Vivek Bhandarkar.V. N
ME	Dr. P. Sudhakar
ME	Dr. Rajesh. S. M
ME	Dr. Padmavathi. G
ME	Dr.  Ranjitha. P
ME	Dr. Bindhushree. B. S
RAI	 Prof. Nishchitha M H
RAI	 Prof. Madhushree M
ET	Dr. Anitha Suresh
ET	Dr. Pushpa B R
DS	Prof. Ankita Mandore
DS	Prof .Ramesh Prasad
Cy. Sy.	Dr. Deepthi V S
Cy. Sy.	Dr. Rakshitha Kiran`;

    const lines = facultyInput.split('\n');
    const dutiesToSeed = [];

    const normalizeName = (name) => {
      return name.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
    };

    const toTitleCase = (str) => {
      if (!str) return "";
      return str.toLowerCase().split(' ').filter(w => w).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    lines.forEach((line, index) => {
      const match = line.match(/^\S+\s+(.+)$/);
      if (match) {
        let facultyName = match[1].trim();
        facultyName = toTitleCase(normalizeName(facultyName));
        
        dutiesToSeed.push({
          faculty_name: facultyName,
          exam_name: index % 2 === 0 ? "Theory Exam" : "Lab Exam",
          exam_date: new Date(`2026-04-${(index % 25) + 1}`),
          exam_time: index % 3 === 0 ? "09:30" : "14:00",
          venue: index % 4 === 0 ? "Block A, Room 101" : "Block B, Room 202",
          notification_sent: false
        });
      }
    });

    await Duty.insertMany(dutiesToSeed);
    console.log(`Successfully seeded ${dutiesToSeed.length} duties for ${lines.length} faculty members.`);
    
    process.exit();
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
}

seedData();
