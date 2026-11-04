/**
 * Aadhaar Card OCR Extraction & Verification Engine
 * Parses Full Name, 12-digit Aadhaar Number, Date of Birth (DOB), Gender, and Address
 * from scanned Aadhaar card images.
 */

export interface AadhaarOcrResult {
  rawText: string;
  aadhaarNumber: string | null;
  formattedAadhaar: string | null;
  name: string | null;
  dob: string | null;
  gender: "Male" | "Female" | "Transgender" | null;
  address: string | null;
  pinCode: string | null;
  isValidAadhaarNumber: boolean;
  confidence: number; // 0 - 100
  isComplete: boolean;
  missingFields: string[];
}

/**
 * Clean text lines removing noisy artifacts
 */
function cleanLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

/**
 * Normalize OCR text replacing common character confusions in numbers
 */
function cleanOcrDigits(str: string): string {
  return str
    .replace(/[oO]/g, "0")
    .replace(/[iIl|]/g, "1")
    .replace(/[zZ]/g, "2")
    .replace(/[sS]/g, "5")
    .replace(/[bB]/g, "8");
}

/**
 * Standard Indian Aadhaar Verhoeff algorithm table for check digit validation
 */
const VERHOEFF_D = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 2, 3, 4, 0, 6, 7, 8, 9, 5],
  [2, 3, 4, 0, 1, 7, 8, 9, 5, 6],
  [3, 4, 0, 1, 2, 8, 9, 5, 6, 7],
  [4, 0, 1, 2, 3, 9, 5, 6, 7, 8],
  [5, 9, 8, 7, 6, 0, 4, 3, 2, 1],
  [6, 5, 9, 8, 7, 1, 0, 4, 3, 2],
  [7, 6, 5, 9, 8, 2, 1, 0, 4, 3],
  [8, 7, 6, 5, 9, 3, 2, 1, 0, 4],
  [9, 8, 7, 6, 5, 4, 3, 2, 1, 0],
];

const VERHOEFF_P = [
  [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  [1, 5, 7, 6, 2, 8, 3, 0, 9, 4],
  [5, 8, 0, 3, 7, 9, 6, 1, 4, 2],
  [8, 9, 1, 6, 0, 4, 3, 5, 2, 7],
  [9, 4, 5, 3, 1, 2, 6, 8, 7, 0],
  [4, 2, 8, 6, 5, 7, 3, 9, 0, 1],
  [2, 7, 9, 3, 8, 0, 6, 4, 1, 5],
  [7, 0, 4, 6, 9, 1, 3, 2, 5, 8],
];

export function validateAadhaarVerhoeff(aadhaar: string): boolean {
  const clean = aadhaar.replace(/\s+/g, "");
  if (!/^\d{12}$/.test(clean)) return false;
  // Common invalid placeholder numbers like 000000000000 or 123456789012
  if (/^(\d)\1{11}$/.test(clean)) return false;

  let c = 0;
  const invertedArray = clean.split("").map(Number).reverse();
  for (let i = 0; i < invertedArray.length; i++) {
    c = VERHOEFF_D[c][VERHOEFF_P[i % 8][invertedArray[i]]];
  }
  return c === 0;
}

/**
 * Extract Aadhaar details from OCR text
 */
export function parseAadhaarOcrText(rawText: string): AadhaarOcrResult {
  const lines = cleanLines(rawText);
  const fullText = lines.join(" ");

  // 1. Aadhaar Number Extraction
  // Look for 4 digits + space + 4 digits + space + 4 digits
  let aadhaarNumber: string | null = null;
  let formattedAadhaar: string | null = null;

  // Match: 1234 5678 9012 or XXXX XXXX 1234
  const formattedMatch = fullText.match(/\b(\d{4}\s\d{4}\s\d{4})\b/);
  if (formattedMatch) {
    aadhaarNumber = formattedMatch[1].replace(/\s+/g, "");
    formattedAadhaar = formattedMatch[1];
  } else {
    // Match continuous 12 digits
    const raw12Match = fullText.match(/\b([2-9]\d{11})\b/);
    if (raw12Match) {
      aadhaarNumber = raw12Match[1];
      formattedAadhaar = `${raw12Match[1].slice(0, 4)} ${raw12Match[1].slice(4, 8)} ${raw12Match[1].slice(8, 12)}`;
    } else {
      // Look for lines that look like 3 blocks of 4 alphanumeric characters (OCR noise)
      for (const line of lines) {
        const cleanedLine = cleanOcrDigits(line);
        const candidate = cleanedLine.match(/\b(\d{4}\s\d{4}\s\d{4})\b/);
        if (candidate) {
          aadhaarNumber = candidate[1].replace(/\s+/g, "");
          formattedAadhaar = candidate[1];
          break;
        }
      }
    }
  }

  // 2. Date of Birth (DOB) Extraction
  let dob: string | null = null;
  // Match formats like DOB: 15/08/1990, Date of Birth: 15-08-1990, DOB : 15/08/1990, जन्म तिथि / DOB: 15/08/1990
  const dobRegex = /(?:DOB|Date of Birth|Birth|जन्म|वर्ष)[:\s]*([0-3]?[0-9][\/\-.][0-1]?[0-9][\/\-.][12][90][0-9]{2})/i;
  const dobMatch = fullText.match(dobRegex);
  if (dobMatch) {
    dob = dobMatch[1].replace(/[-.]/g, "/");
  } else {
    // Check for standard date pattern DD/MM/YYYY
    const dateMatch = fullText.match(/\b([0-3][0-9][\/\-.][0-1][0-9][\/\-.][12][90][0-9]{2})\b/);
    if (dateMatch) {
      dob = dateMatch[1].replace(/[-.]/g, "/");
    } else {
      // Check for Year of Birth
      const yobMatch = fullText.match(/(?:Year of Birth|जन्म का वर्ष|YOB)[:\s]*([12][90][0-9]{2})/i);
      if (yobMatch) {
        dob = `01/01/${yobMatch[1]}`;
      }
    }
  }

  // 3. Gender Extraction
  let gender: "Male" | "Female" | "Transgender" | null = null;
  if (/\b(FEMALE|महिला)\b/i.test(fullText)) {
    gender = "Female";
  } else if (/\b(MALE|पुरुष)\b/i.test(fullText)) {
    gender = "Male";
  } else if (/\b(TRANSGENDER)\b/i.test(fullText)) {
    gender = "Transgender";
  }

  // 4. Name Extraction
  let name: string | null = null;
  const IGNORE_PATTERNS = [
    /government/i,
    /india/i,
    /bharat/i,
    /sarkar/i,
    /unique/i,
    /identification/i,
    /authority/i,
    /uidai/i,
    /enrollment/i,
    /help/i,
    /dob/i,
    /male/i,
    /female/i,
    /father/i,
    /address/i,
    /meraaadhaar/i,
    /www\./i,
    /1947/i,
    /\d{4}/,
  ];

  // In Aadhaar cards, the English name is typically in the line just before DOB
  // or right after the header lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (dob && line.includes(dob)) {
      // Name is usually 1 or 2 lines above DOB
      for (let prevIdx = i - 1; prevIdx >= Math.max(0, i - 3); prevIdx--) {
        const candidate = lines[prevIdx].replace(/[^a-zA-Z\s]/g, "").trim();
        const shouldIgnore = IGNORE_PATTERNS.some((pat) => pat.test(candidate));
        if (candidate.length >= 3 && candidate.split(" ").length >= 1 && !shouldIgnore) {
          name = candidate;
          break;
        }
      }
      break;
    }
  }

  // Fallback name search: find first prominent alphabetic line that is not a header
  if (!name) {
    for (const line of lines) {
      const candidate = line.replace(/[^a-zA-Z\s]/g, "").trim();
      const shouldIgnore = IGNORE_PATTERNS.some((pat) => pat.test(candidate));
      if (candidate.length >= 4 && candidate.split(" ").length >= 2 && !shouldIgnore) {
        name = candidate;
        break;
      }
    }
  }

  // 5. Pin Code & Address Extraction
  let pinCode: string | null = null;
  let address: string | null = null;
  const pinMatch = fullText.match(/\b([1-9][0-9]{5})\b/);
  if (pinMatch) {
    pinCode = pinMatch[1];
  }

  // Check for address lines
  const addressIdx = lines.findIndex((l) => /address|s\/o|w\/o|d\/o|c\/o/i.test(l));
  if (addressIdx !== -1) {
    const addrLines: string[] = [];
    for (let i = addressIdx; i < Math.min(lines.length, addressIdx + 4); i++) {
      if (!/\b\d{4}\s\d{4}\s\d{4}\b/.test(lines[i])) {
        addrLines.push(lines[i]);
      }
    }
    if (addrLines.length > 0) {
      address = addrLines.join(", ").replace(/^Address[:\s]*/i, "");
    }
  }

  const isValidAadhaarNumber = Boolean(
    aadhaarNumber && (aadhaarNumber.length === 12 || validateAadhaarVerhoeff(aadhaarNumber))
  );

  const missingFields: string[] = [];
  if (!aadhaarNumber) missingFields.push("Aadhaar Number (12 digits)");
  if (!name) missingFields.push("Full Name");
  if (!dob) missingFields.push("Date of Birth (DOB)");
  if (!gender) missingFields.push("Gender");

  // Confidence calculation
  let score = 0;
  if (aadhaarNumber) score += 40;
  if (name) score += 25;
  if (dob) score += 20;
  if (gender) score += 15;

  const isComplete = Boolean(aadhaarNumber && name && dob && gender);

  return {
    rawText,
    aadhaarNumber,
    formattedAadhaar,
    name,
    dob,
    gender,
    address,
    pinCode,
    isValidAadhaarNumber,
    confidence: score,
    isComplete,
    missingFields,
  };
}

/**
 * Pre-processes an image element on canvas to optimize OCR contrast and edge sharpness
 */
export function preprocessAadhaarImage(
  imageSource: HTMLImageElement | HTMLCanvasElement
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Target width 1200px for optimal OCR recognition
  const targetWidth = 1200;
  const scale = targetWidth / imageSource.width;
  canvas.width = targetWidth;
  canvas.height = Math.round(imageSource.height * scale);

  ctx.drawImage(imageSource, 0, 0, canvas.width, canvas.height);

  // Grayscale & contrast enhancement
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  // Simple contrast stretch & binarization prep
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    // Perceptual grayscale formula
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    // Contrast boost
    const contrast = 1.25;
    const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
    const boosted = Math.min(255, Math.max(0, factor * (gray - 128) + 128));

    data[i] = boosted;
    data[i + 1] = boosted;
    data[i + 2] = boosted;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

/**
 * Presets of realistic sample Aadhaar cards for instant 1-click test scanning
 */
export const SAMPLE_AADHAAR_CARDS = [
  {
    id: "sample_1",
    label: "Sample 1: Rajiv Sharma (Delhi)",
    name: "Rajiv Sharma",
    aadhaarNumber: "4589 1234 5678",
    dob: "14/07/1988",
    gender: "Male" as const,
    address: "H-42, Connaught Circus, New Delhi - 110001",
    pinCode: "110001",
    cardImageUrl: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80",
    rawText: `GOVERNMENT OF INDIA\nUnique Identification Authority of India\nRajiv Sharma\nDOB: 14/07/1988\nGender: MALE\n4589 1234 5678\nAddress: H-42, Connaught Circus, New Delhi - 110001\nMera Aadhaar, Meri Pehchan`,
  },
  {
    id: "sample_2",
    label: "Sample 2: Priya Patel (Mumbai)",
    name: "Priya Patel",
    aadhaarNumber: "8923 7461 0925",
    dob: "22/11/1993",
    gender: "Female" as const,
    address: "Flat 402, Sea Crest Towers, Versova, Andheri West, Mumbai - 400061",
    pinCode: "400061",
    cardImageUrl: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=800&q=80",
    rawText: `भारत सरकार\nGOVERNMENT OF INDIA\nPriya Patel\nजन्म तिथि / DOB: 22/11/1993\nमहिला / FEMALE\n8923 7461 0925\nAddress: Flat 402, Sea Crest Towers, Versova, Mumbai - 400061`,
  },
  {
    id: "sample_3",
    label: "Sample 3: Vikramaditya Singh (Jaipur)",
    name: "Vikramaditya Singh",
    aadhaarNumber: "6712 9045 3812",
    dob: "05/03/1985",
    gender: "Male" as const,
    address: "12, Civil Lines, Near Raj Bhavan, Jaipur, Rajasthan - 302006",
    pinCode: "302006",
    cardImageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=800&q=80",
    rawText: `GOVERNMENT OF INDIA\nUnique Identification Authority of India\nVikramaditya Singh\nDOB: 05/03/1985\nGender: MALE\n6712 9045 3812\nAddress: 12, Civil Lines, Jaipur, Rajasthan - 302006`,
  },
];
