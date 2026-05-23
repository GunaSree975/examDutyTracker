const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const pdf = require('pdf-parse');
const XLSX = require('xlsx');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Mongoose Model
const dutySchema = new mongoose.Schema({
  faculty_name: { type: String, required: true },
  exam_name: String,
  exam_date: Date,
  exam_time: String, // HH:MM format
  venue: String,
  is_completed: { type: Boolean, default: false },
  notification_sent: { type: Boolean, default: false },
  last_updated: { type: Date, default: Date.now }
}, { timestamps: true });

dutySchema.index({ 
  faculty_name: 1, 
  exam_name: 1,
  exam_date: 1
}, { unique: true });

const Duty = mongoose.model('Duty', dutySchema);

// Log index creation status
Duty.on('index', (err) => {
  if (err) console.error('MongoDB Index Error:', err);
  else console.log('MongoDB Unique Index created/verified.');
});

// Multer Storage Setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const allowedExtensions = new Set(['.pdf', '.xlsx', '.xls']);
const upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!allowedExtensions.has(ext)) {
      return cb(new Error('Only PDF and Excel files are supported'));
    }
    cb(null, true);
  }
});

// Parsing Helpers
const normalizeName = (name) => {
  return name.replace(/\s+/g, ' ').replace(/\.$/, '').trim();
};

const toTitleCase = (str) => {
  if (!str) return "";
  return str.toLowerCase().split(' ').filter(w => w).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

const escapeRegex = (value) => String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeFacultyQuery = (value) => String(value || '')
  .replace(/^(Dr|Prof|Mr|Mrs|Ms)\.?\s+/i, '')
  .replace(/[^a-z0-9]+/gi, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const buildFlexibleFacultyRegex = (value) => {
  const normalized = normalizeFacultyQuery(value);
  if (!normalized) return null;
  const tokens = normalized.split(' ').map(escapeRegex).filter(Boolean);
  if (!tokens.length) return null;
  return new RegExp(tokens.join('[\\s.\\-]*'), 'i');
};

const parsePDF = async (filePath) => {
  const dataBuffer = fs.readFileSync(filePath);
  try {
    const data = await pdf(dataBuffer);
    console.log("PDF TEXT EXTRACTED (first 200 chars):", data.text.substring(0, 200));
    return data.text;
  } catch (err) {
    console.error("PDF PARSE CORE ERROR:", err);
    throw new Error("Failed to extract text from PDF");
  }
};

const normalizeHeader = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

const looksLikeExcelDateSerial = (value) => typeof value === 'number' && value > 20000 && value < 70000;

const toDateValue = (value) => {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (looksLikeExcelDateSerial(value)) {
    const converted = XLSX.SSF.parse_date_code(value);
    if (converted) return new Date(Date.UTC(converted.y, converted.m - 1, converted.d));
  }
  if (typeof value === 'string') {
    const normalized = value.trim();
    const dmy = normalized.match(/^(\d{1,2})[-./](\d{1,2})[-./](\d{2,4})$/);
    if (dmy) {
      let day = parseInt(dmy[1], 10);
      let month = parseInt(dmy[2], 10);
      let year = parseInt(dmy[3], 10);
      if (year < 100) year += 2000;
      const dateObj = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(dateObj.getTime())) return dateObj;
    }
  }
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
};

const toTimeString = (value) => {
  if (value == null || value === '') return '';
  if (typeof value === 'number') {
    const converted = XLSX.SSF.parse_date_code(value);
    if (converted) {
      const hh = String(converted.H || 0).padStart(2, '0');
      const mm = String(converted.M || 0).padStart(2, '0');
      return `${hh}:${mm}`;
    }
  }
  const raw = String(value).trim();
  const lowered = raw.toLowerCase();
  if (lowered.includes('afternoon') || lowered.includes('pm')) return '14:00';
  if (lowered.includes('forenoon') || lowered.includes('morning') || lowered.includes('am')) return '09:30';

  const match = raw.match(/(\d{1,2})[:.](\d{2})/);
  if (match) {
    let hh = parseInt(match[1], 10);
    const mm = match[2];
    if (lowered.includes('pm') && hh < 12) hh += 12;
    if (lowered.includes('am') && hh === 12) hh = 0;
    return `${String(hh).padStart(2, '0')}:${mm}`;
  }
  return raw;
};

const EXCEL_ALIAS_MAP = {
  faculty_name: ['facultyname', 'faculty', 'name', 'staffname', 'teachername', 'facultynamedepartment'],
  exam_name: ['examname', 'exam', 'subject', 'dutytype', 'type', 'course', 'papercode', 'papername'],
  exam_date: ['examdate', 'date', 'dutydate', 'scheduledate'],
  exam_time: ['examtime', 'time', 'session', 'slot', 'timing', 'timeslot'],
  venue: ['venue', 'hall', 'room', 'block', 'location', 'center', 'centre']
};

const excelHeaderScore = (headers) => {
  let score = 0;
  const normalized = headers.map(normalizeHeader);
  Object.values(EXCEL_ALIAS_MAP).forEach((aliases) => {
    if (normalized.some((h) => aliases.includes(h))) score += 1;
  });
  return score;
};

const mapRowByAliases = (row) => {
  const rowKeys = Object.keys(row);
  const getValue = (aliases) => {
    for (const key of rowKeys) {
      if (aliases.includes(normalizeHeader(key))) return row[key];
    }
    return '';
  };

  return {
    rawFaculty: getValue(EXCEL_ALIAS_MAP.faculty_name),
    rawExam: getValue(EXCEL_ALIAS_MAP.exam_name),
    rawDate: getValue(EXCEL_ALIAS_MAP.exam_date),
    rawTime: getValue(EXCEL_ALIAS_MAP.exam_time),
    rawVenue: getValue(EXCEL_ALIAS_MAP.venue)
  };
};

const convertMappedRowToDuty = (mappedRow) => {
  if (!mappedRow.rawFaculty || !mappedRow.rawDate) return null;
  const dateValue = toDateValue(mappedRow.rawDate);
  if (!dateValue) return null;

  return {
    faculty_name: toTitleCase(normalizeName(String(mappedRow.rawFaculty))),
    exam_name: String(mappedRow.rawExam || 'Exam Duty').trim() || 'Exam Duty',
    exam_date: dateValue,
    exam_time: toTimeString(mappedRow.rawTime) || '09:30',
    venue: String(mappedRow.rawVenue || 'See Schedule').trim() || 'See Schedule',
    last_updated: new Date()
  };
};

const parseExcelSheetRows = (worksheet) => {
  const rowsAsObjects = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
  if (rowsAsObjects.length > 0) return rowsAsObjects;

  // Some exported sheets have extra metadata rows before actual header.
  const rowsAsArrays = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
  if (!rowsAsArrays.length) return [];

  const bestHeaderIndex = rowsAsArrays
    .slice(0, 20)
    .map((row, idx) => ({ idx, score: excelHeaderScore((row || []).map((c) => String(c || ''))) }))
    .sort((a, b) => b.score - a.score)[0];

  if (!bestHeaderIndex || bestHeaderIndex.score < 2) return [];

  const headerRow = rowsAsArrays[bestHeaderIndex.idx].map((h, i) => String(h || `column_${i + 1}`).trim());
  const dataRows = rowsAsArrays.slice(bestHeaderIndex.idx + 1);

  return dataRows.map((row) => {
    const obj = {};
    headerRow.forEach((h, i) => {
      obj[h] = row[i] ?? '';
    });
    return obj;
  });
};

const parseExcelDuties = async (filePath) => {
  const workbook = XLSX.readFile(filePath, { cellDates: true });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];

  const parsed = [];
  const allRows = [];
  for (const sheetName of workbook.SheetNames) {
    const worksheet = workbook.Sheets[sheetName];
    const rows = parseExcelSheetRows(worksheet);
    allRows.push(...rows);

    for (const row of rows) {
      const mapped = mapRowByAliases(row);
      const duty = convertMappedRowToDuty(mapped);
      if (duty) parsed.push(duty);
    }
  }

  // Fallback: convert sheet rows to text and reuse dictionary parser if headers are not clear.
  if (parsed.length > 0) return parsed;

  // Lenient fallback for unpredictable headers in Excel exports.
  for (const row of allRows) {
    const values = Object.values(row).map((v) => String(v || '').trim()).filter(Boolean);
    if (!values.length) continue;

    const detectedDate = Object.values(row).map(toDateValue).find(Boolean);
    if (!detectedDate) continue;

    const detectedFaculty = values.find((v) => /[a-z]/i.test(v) && !/\d{1,2}[-./]\d{1,2}/.test(v));
    if (!detectedFaculty) continue;

    parsed.push({
      faculty_name: toTitleCase(normalizeName(detectedFaculty)),
      exam_name: values.find((v) => /dcs|exam|invigilation|theory|lab/i.test(v)) || 'Exam Duty',
      exam_date: detectedDate,
      exam_time: toTimeString(values.find((v) => /am|pm|afternoon|forenoon|morning|\d{1,2}[:.]\d{2}/i.test(v))) || '09:30',
      venue: values.find((v) => /room|hall|block|venue|lab/i.test(v)) || 'See Schedule',
      last_updated: new Date()
    });
  }

  if (parsed.length > 0) return parsed;
  const sheetText = allRows.map((r) => Object.values(r).join(' ')).join('\n');
  return sheetText.trim() ? parseDictionaryDuties(sheetText) : [];
};

const dutyKey = (duty) => {
  const date = duty?.exam_date instanceof Date ? duty.exam_date : new Date(duty?.exam_date);
  const dateKey = isNaN(date.getTime()) ? String(duty?.exam_date || '') : date.toISOString().slice(0, 10);
  return `${String(duty?.faculty_name || '').toLowerCase().trim()}-${dateKey}`;
};

// API Endpoints

// Upload and Parse PDF
// Shared Parsing Logic
const parseDictionaryDuties = async (text) => {
    const rawDuties = [];
    const allFaculty = await Duty.distinct('faculty_name');
    const facultyList = allFaculty.sort((a, b) => b.length - a.length);

    // Pass 1: Find all Dates and their positions
    const dateRegex = /(\d{1,2})[-./](\d{1,2})([-./]\d{2,4})?/g;
    const foundDates = [];
    let dMatch;
    while ((dMatch = dateRegex.exec(text)) !== null) {
      let day = parseInt(dMatch[1]);
      let month = parseInt(dMatch[2]);
      let year = dMatch[3] ? parseInt(dMatch[3].replace(/[-./]/g, '')) : 2026;
      if (year < 100) year += 2000;
      const d = new Date(Date.UTC(year, month - 1, day));
      if (!isNaN(d.getTime())) {
        foundDates.push({ date: d, index: dMatch.index });
      }
    }

    // Pass 2: Find all names and their positions
    const foundFacultyOccurrences = [];
    for (const name of facultyList) {
      const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '[.\\s]*');
      const nRegex = new RegExp(`\\b${escaped}\\b`, 'gi');
      let nMatch;
      while ((nMatch = nRegex.exec(text)) !== null) {
        foundFacultyOccurrences.push({ name: name, index: nMatch.index });
      }
    }

    // Pass 3: Associate names with nearest dates (within 1000 chars)
    for (const occ of foundFacultyOccurrences) {
      let nearestDate = null;
      let minDistance = 1001;

      for (const dObj of foundDates) {
        const distance = Math.abs(occ.index - dObj.index);
        if (distance < minDistance) {
          minDistance = distance;
          nearestDate = dObj.date;
        }
      }

      if (nearestDate) {
        // Extract context for type/venue
        const context = text.substring(Math.max(0, occ.index - 100), Math.min(text.length, occ.index + 100));
        rawDuties.push({
          faculty_name: toTitleCase(normalizeName(occ.name)),
          exam_name: context.match(/DCS|Emergency|Invigilation|Theory|Lab/i)?.[0] || "Exam Duty",
          exam_date: nearestDate,
          exam_time: context.includes("Afternoon") || context.includes("14:00") || context.includes("2.00") ? "14:00" : "09:30",
          venue: context.match(/Room\s*[\w-]+|Block\s*[\w-]+/i)?.[0] || "See Schedule",
          last_updated: new Date()
        });
      }
    }
    
    // Deduplicate
    const uniqueMap = new Map();
    rawDuties.forEach(d => {
      const key = `${d.faculty_name}-${d.exam_date.getTime()}`;
      if (!uniqueMap.has(key)) uniqueMap.set(key, d);
    });

    return Array.from(uniqueMap.values());
};

// Upload and Parse PDF or Text
app.post('/api/upload', upload.array('pdf', 20), async (req, res) => {
  try {
    let duties = [];
    const files = Array.isArray(req.files) ? req.files : [];
    if (files.length > 0) {
      const fileResults = [];
      for (const file of files) {
        const ext = path.extname(file.originalname || '').toLowerCase();
        let fileDuties = [];
        if (ext === '.pdf') {
          const sourceText = await parsePDF(file.path);
          fileDuties = await parseDictionaryDuties(sourceText);
        } else if (ext === '.xlsx' || ext === '.xls') {
          fileDuties = await parseExcelDuties(file.path);
        } else {
          return res.status(400).json({ error: 'Unsupported file type.' });
        }
        duties.push(...fileDuties);
        fileResults.push({
          fileName: file.originalname,
          fileType: ext,
          parsedCount: fileDuties.length
        });
      }
      req._fileResults = fileResults;
    } else if (req.body.text) {
      duties = await parseDictionaryDuties(req.body.text);
    } else {
      return res.status(400).send('No file or text provided.');
    }

    if (duties.length > 0) {
      const uniqueMap = new Map();
      duties.forEach((duty) => {
        uniqueMap.set(dutyKey(duty), duty);
      });
      const uniqueDuties = Array.from(uniqueMap.values());

      for (const duty of uniqueDuties) {
        await Duty.findOneAndUpdate(
          { faculty_name: { $regex: new RegExp(escapeRegex(duty.faculty_name), 'i') }, exam_date: duty.exam_date },
          duty,
          { upsert: true }
        );
      }
      res.status(200).json({
        message: 'Duties parsed and saved!',
        count: uniqueDuties.length,
        filesProcessed: files.length || 0,
        fileResults: req._fileResults || [],
        preview: uniqueDuties.slice(0, 10).map((d) => ({
          faculty_name: d.faculty_name,
          exam_name: d.exam_name,
          exam_date: d.exam_date,
          exam_time: d.exam_time,
          venue: d.venue
        }))
      });
    } else {
      res.status(200).json({ 
        message: 'No duty matches found in text.', 
        count: 0,
        filesProcessed: files.length || 0,
        fileResults: req._fileResults || [],
        preview: []
      });
    }
  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    res.status(500).json({ error: 'Processing error', details: error.message });
  } finally {
    const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
    files.forEach((file) => {
      if (file && file.path) fs.unlink(file.path, () => {});
    });
  }
});

// Get Duties for a Faculty
app.get('/api/duties/:facultyName', async (req, res) => {
  try {
    let name = req.params.facultyName.trim();
    
    // Flexible match: supports "YOGESH B S", "Yogesh B.S", "Prof. Yogesh B S", etc.
    const searchRegex = buildFlexibleFacultyRegex(name);
    if (!searchRegex) return res.json([]);

    const duties = await Duty.find({ 
      faculty_name: { $regex: searchRegex } 
    }).sort({ exam_date: 1 });
    res.json(duties);
  } catch (error) {
    res.status(500).send('Error fetching duties');
  }
});

// Toggle Duty Completion
app.patch('/api/duties/:id/complete', async (req, res) => {
  console.log("PATCH request received for duty:", req.params.id);
  try {
    const duty = await Duty.findById(req.params.id);
    if (!duty) {
      console.warn("Duty not found:", req.params.id);
      return res.status(404).send('Duty not found');
    }
    
    duty.is_completed = !duty.is_completed;
    await duty.save();
    console.log("Duty updated successfully. New status:", duty.is_completed);
    res.json(duty);
  } catch (error) {
    console.error("PATCH ERROR:", error);
    res.status(500).send('Error updating duty');
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
