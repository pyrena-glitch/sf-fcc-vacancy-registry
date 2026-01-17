import { useState, useRef } from 'react';
import { Child } from '../types';
import { Upload, FileSpreadsheet, X, Check } from 'lucide-react';

interface CsvImportProps {
  onImport: (children: Omit<Child, 'id'>[]) => void;
  onClose: () => void;
}

interface ParsedRow {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  enrollmentDate: string;
  expectedDepartureDate?: string;
  valid: boolean;
  errors: string[];
}

function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try various date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{1,2})-(\d{1,2})$/,
    // US format MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // US format MM-DD-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
  ];

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let year: number, month: number, day: number;

      if (format === formats[0]) {
        // ISO: YYYY-MM-DD
        [, year, month, day] = match.map(Number) as [unknown, number, number, number];
      } else {
        // US: MM/DD/YYYY or MM-DD-YYYY
        [, month, day, year] = match.map(Number) as [unknown, number, number, number];
      }

      // Validate date
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 1900 && year <= 2100) {
        return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      }
    }
  }

  return null;
}

function parseCsv(content: string): ParsedRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());

  // Find column indices
  const firstNameIdx = headers.findIndex(h => h.includes('first') && h.includes('name'));
  const lastNameIdx = headers.findIndex(h => h.includes('last') && h.includes('name'));
  const dobIdx = headers.findIndex(h => h.includes('birth') || h.includes('dob'));
  const enrollIdx = headers.findIndex(h => h.includes('enroll') || h.includes('start'));
  const departureIdx = headers.findIndex(h => h.includes('depart') || h.includes('end') || h.includes('leave'));

  // Alternative: single name column
  const nameIdx = headers.findIndex(h => h === 'name' || h === 'child name' || h === 'child');

  const rows: ParsedRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
    const errors: string[] = [];

    let firstName = '';
    let lastName = '';

    if (firstNameIdx >= 0 && lastNameIdx >= 0) {
      firstName = values[firstNameIdx] || '';
      lastName = values[lastNameIdx] || '';
    } else if (nameIdx >= 0) {
      const nameParts = (values[nameIdx] || '').split(' ');
      firstName = nameParts[0] || '';
      lastName = nameParts.slice(1).join(' ') || '';
    }

    if (!firstName) errors.push('Missing first name');

    const dobRaw = dobIdx >= 0 ? values[dobIdx] : '';
    const dateOfBirth = parseDate(dobRaw);
    if (!dateOfBirth) errors.push('Invalid date of birth');

    const enrollRaw = enrollIdx >= 0 ? values[enrollIdx] : '';
    const enrollmentDate = parseDate(enrollRaw) || new Date().toISOString().split('T')[0];

    const departureRaw = departureIdx >= 0 ? values[departureIdx] : '';
    const expectedDepartureDate = parseDate(departureRaw) || undefined;

    rows.push({
      firstName,
      lastName,
      dateOfBirth: dateOfBirth || '',
      enrollmentDate,
      expectedDepartureDate,
      valid: errors.length === 0,
      errors,
    });
  }

  return rows;
}

export function CsvImport({ onImport, onClose }: CsvImportProps) {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const rows = parseCsv(content);
      setParsedRows(rows);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.type === 'text/csv')) {
      handleFile(file);
    }
  };

  const handleImport = () => {
    const validChildren = parsedRows
      .filter(row => row.valid)
      .map(row => ({
        firstName: row.firstName,
        lastName: row.lastName,
        dateOfBirth: row.dateOfBirth,
        enrollmentDate: row.enrollmentDate,
        expectedDepartureDate: row.expectedDepartureDate,
      }));

    onImport(validChildren);
    onClose();
  };

  const validCount = parsedRows.filter(r => r.valid).length;
  const invalidCount = parsedRows.filter(r => !r.valid).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Import from CSV</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        {parsedRows.length === 0 ? (
          <>
            <div
              className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
                dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
              }`}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
            >
              <FileSpreadsheet size={48} className="mx-auto text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">Drag and drop a CSV file here</p>
              <p className="text-gray-400 text-sm mb-4">or</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Browse Files
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </div>

            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-700 mb-2">Expected CSV Format</h4>
              <p className="text-sm text-gray-600 mb-2">
                Your CSV should have headers like:
              </p>
              <code className="text-xs bg-gray-200 p-2 rounded block">
                First Name, Last Name, Date of Birth, Enrollment Date
              </code>
              <p className="text-xs text-gray-500 mt-2">
                Dates can be in YYYY-MM-DD or MM/DD/YYYY format
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="mb-4 flex gap-4">
              <div className="flex items-center gap-2 text-green-600">
                <Check size={16} />
                <span>{validCount} valid rows</span>
              </div>
              {invalidCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <X size={16} />
                  <span>{invalidCount} invalid rows</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg overflow-hidden mb-4 max-h-64 overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-left">DOB</th>
                    <th className="px-3 py-2 text-left">Issues</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {parsedRows.map((row, i) => (
                    <tr key={i} className={row.valid ? '' : 'bg-red-50'}>
                      <td className="px-3 py-2">
                        {row.valid ? (
                          <Check size={16} className="text-green-600" />
                        ) : (
                          <X size={16} className="text-red-600" />
                        )}
                      </td>
                      <td className="px-3 py-2">{row.firstName} {row.lastName}</td>
                      <td className="px-3 py-2">{row.dateOfBirth || '-'}</td>
                      <td className="px-3 py-2 text-red-600 text-xs">
                        {row.errors.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setParsedRows([])}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Choose Different File
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Upload size={16} />
                Import {validCount} Children
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
