const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const facultyNames = [
  "Prof. Kavya D N", "Prof Anupama V P", "Dr. B R Veena", "Dr. Rajani M R",
  "Prof. Shruthi S B", "Prof. Kavyashree K.R", "Prof. C Manasa", "Prof. Harpreet Kaur Thind",
  "Prof. Pruthvi C.N", "Prof. Poornima D", "Prof. Swathi BV", "Prof. Nayana U Shinde",
  "Dr. Shobha N", "Dr.R. SHANTI VENGADESHWARI", "Prof. T.P.SANJEEV", "Dr. DOMA HEMANTH KUMAR",
  "Prof. H.N.SRIDHAR", "Prof. SHAHAJI PATIL", "Prof. SPOORTHY S S", "Prof. ASHWINI SATYANARAYANA",
  "Prof. RAGHAVENDRA H N", "Prof. UJWAL M. S", "Prof. RAGHAVENDRA PRAJWAL H S", "Prof. HARSHITHA M",
  "Prof. SWETTI JHA", "Dr. M. ROOPA", "Dr. P. VIMALA", "Dr. S. THENMOZHI",
  "Dr. MANASA R.", "Dr. SRIVIDYA L.", "Mrs. VIBHA T.G.", "Mrs. KAVITA S. GUDDA",
  "Mrs. SOUMYA P.", "Mrs. CHAITRA A.", "Mrs. ASHWINI GOWDA H B", "Mrs. CHANDANA.S",
  "Dr. SUMIT SWAIN", "Mrs. REHKA KIRSHNA", "Mr. ARYA SUMAN PATTNAIK", "Ms. SOUJANYA R",
  "Dr P B Savitha", "Dr Saravanakumar R", "Dr. Soni M", "Dr. Anubhav Kumar Pandey",
  "Dr. Suvetha P S", "Dr. Supriya J", "Dr. Priyanshu Kumar", "Dr. Sridevi H.R",
  "Dr. Jami Rajesh", "Prof. Satish B A", "Prof. Rachana M Hullamani", "Prof. Anjana Joshi",
  "Prof. Kavyashree J", "Prof. Archana S", "Prof. Shashank S", "Prof. Keerti P",
  "Dr. RESHMA J", "Dr. PRATHIMA MABEL. J.", "Prof. REKHA JAYARAM", "Prof. YOGESH B S",
  "Prof. PREETHI LOKESH", "Prof. IRSHAD KHAN", "Prof. MADHAVARAM SWAPNA", "Dr. K.T. Shivaram",
  "Dr. Sanjay Oli", "Dr. Sowmya.K.", "Dr.Rose Bindu Joseph P", "Dr.Kallugudi Vari Nagamani",
  "Dr.Amruthalakshmi M R", "Dr. Noor Arshika S", "Dr.Venkatesh Babu K P", "Dr.Thangaraj C",
  "Dr. Srinivasan V", "Dr. R. Jayanthi", "Prof. Raksha Kodnad R", "Dr. Vinod Krishna",
  "Dr. Hemantha Y", "Prof. Ramya H P", "Prof. Jayshree K", "Mr. Murigendrayya M",
  "Mr. Krishnan Bandyopadhyay", "Ms. Eeshika Ghosh", "Dr. Ningegowda. B. M", "Dr. M.K.Venkatesh",
  "Dr. Aruna Devi. M", "Dr.V. R Srinivasan", "Dr.Vivek Bhandarkar.V. N", "Dr. P. Sudhakar",
  "Dr. Rajesh. S. M", "Dr. Padmavathi. G", "Dr. Ranjitha. P", "Dr. Bindhushree. B. S",
  "Prof. Nishchitha M H", "Prof. Madhushree M", "Dr. Anitha Suresh", "Dr. Pushpa B R",
  "Prof. Ankita Mandore", "Prof .Ramesh Prasad", "Dr. Deepthi V S", "Dr. Rakshitha Kiran"
];

function generatePDF() {
  const doc = new PDFDocument({ margin: 30 });
  const outputPath = path.join(__dirname, 'public', 'test_schedule.pdf');
  doc.pipe(fs.createWriteStream(outputPath));

  // Header
  doc.fontSize(20).text('OFFICIAL EXAM DUTY SCHEDULE - APRIL 2026', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Generated for Verification Purposes', { align: 'center' });
  doc.moveDown(2);

  // Table Headers
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Faculty Name', 50, 150);
  doc.text('Duty Type', 250, 150);
  doc.text('Date', 350, 150);
  doc.text('Session', 450, 150);
  doc.moveDown();
  doc.moveTo(50, 165).lineTo(550, 165).stroke();

  // Content
  doc.font('Helvetica');
  let y = 175;
  facultyNames.forEach((name, index) => {
    if (y > 700) {
      doc.addPage();
      y = 50;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('Faculty Name', 50, y);
      doc.text('Duty Type', 250, y);
      doc.text('Date', 350, y);
      doc.text('Session', 450, y);
      y += 15;
      doc.moveTo(50, y).lineTo(550, y).stroke();
      y += 10;
      doc.font('Helvetica');
    }

    const date = `10-04-2026`; // Constant for simplicity
    const session = index % 2 === 0 ? 'Morning (09:30)' : 'Afternoon (14:00)';
    const type = index % 3 === 0 ? 'DCS' : 'Invigilation';

    doc.text(name, 50, y);
    doc.text(type, 250, y);
    doc.text(date, 350, y);
    doc.text(session, 450, y);
    
    y += 20;
  });

  doc.end();
  console.log('PDF generated at:', outputPath);
}

generatePDF();
