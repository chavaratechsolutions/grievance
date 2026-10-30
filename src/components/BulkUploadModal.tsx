"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Download
} from "lucide-react";
import { bulkCreateStudents } from "@/app/actions/user-actions";
import { auth } from "@/lib/firebase/client";

interface ParsedStudent {
  displayName: string;
  email: string;
  department: string;
  rollNumber?: string;
  password?: string;
}

interface BulkUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BulkUploadModal({ isOpen, onClose, onSuccess }: BulkUploadModalProps) {
  const [parsedData, setParsedData] = useState<ParsedStudent[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [parsing, setParsing] = useState<boolean>(false);
  const [uploading, setUploading] = useState<boolean>(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<{
    createdCount: number;
    failedCount: number;
    errors: string[];
    createdAccounts: Array<{ email: string; tempPass: string; rollNumber?: string }>;
  } | null>(null);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setParsing(true);
    setParseError(null);
    setUploadResult(null);

    Papa.parse<any>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setParsing(false);
        const validRows: ParsedStudent[] = [];

        results.data.forEach((row) => {
          const name =
            row["Name"] ||
            row["name"] ||
            row["displayName"] ||
            row["Full Name"] ||
            row["full_name"] ||
            "";
          const email =
            row["Email"] ||
            row["email"] ||
            row["Email Address"] ||
            row["email_address"] ||
            "";
          const department =
            row["Department"] ||
            row["department"] ||
            row["Dept"] ||
            row["dept"] ||
            "General";
          const rollNumber =
            row["Roll / Register Number"] ||
            row["Roll Number"] ||
            row["Register Number"] ||
            row["Roll No"] ||
            row["Roll No."] ||
            row["Reg No"] ||
            row["Reg No."] ||
            row["Registration Number"] ||
            row["rollNumber"] ||
            row["roll_number"] ||
            row["roll_no"] ||
            row["Roll"] ||
            row["roll"] ||
            "";
          const password =
            row["Password"] ||
            row["password"] ||
            "";

          if (name && email) {
            validRows.push({
              displayName: name.trim(),
              email: email.trim().toLowerCase(),
              department: department.trim(),
              rollNumber: rollNumber.trim() || undefined,
              password: password.trim() || undefined,
            });
          }
        });

        if (validRows.length === 0) {
          setParseError("Could not find valid rows with 'Name' and 'Email' columns in the CSV.");
        } else {
          setParsedData(validRows);
        }
      },
      error: (err) => {
        setParsing(false);
        setParseError(`Failed to parse CSV: ${err.message}`);
      },
    });
  };

  const handleDownloadSample = () => {
    const sampleCsv = `Name,Email,Department,Roll Number\nSreejith R,sreejith@college.edu,Computer Science & Engineering,100001\nAbhijith,abhijith@college.edu,Electronics & Communication,100002`;
    const blob = new Blob([sampleCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "student_bulk_sample.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleProcessUpload = async () => {
    if (parsedData.length === 0) return;

    // Validate that every student has a Roll Number of at least 6 characters (used as password)
    const invalidRows = parsedData.filter(
      (s) => !s.password && (!s.rollNumber || s.rollNumber.length < 6)
    );
    if (invalidRows.length > 0) {
      const sampleNames = invalidRows.slice(0, 3).map((r) => r.displayName || r.email).join(", ");
      const more = invalidRows.length > 3 ? ` and ${invalidRows.length - 3} others` : "";
      setParseError(
        `${invalidRows.length} student(s) (${sampleNames}${more}) have missing or invalid Roll Numbers (< 6 characters). Students require a valid Roll Number of at least 6 characters to set their password.`
      );
      return;
    }

    setUploading(true);
    setParseError(null);

    const token = await auth.currentUser?.getIdToken();
    const res = await bulkCreateStudents(parsedData, token);
    setUploading(false);

    if (res.success && res.data) {
      setUploadResult(res.data);
      onSuccess();
    } else {
      setParseError(res.error || "Bulk provisioning failed on server.");
    }
  };

  const handleDownloadReport = () => {
    if (!uploadResult || uploadResult.createdAccounts.length === 0) return;
    const reportCsv = ["Email,Roll Number,Initial Password"].concat(
      uploadResult.createdAccounts.map((a) => `${a.email},${a.rollNumber || a.tempPass},${a.tempPass}`)
    ).join("\n");

    const blob = new Blob([reportCsv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `provisioned_students_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleClose = () => {
    setParsedData([]);
    setFileName("");
    setParseError(null);
    setUploadResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Bulk CSV Student Provisioning
              </h3>
              <p className="text-xs text-zinc-500">
                Generate student accounts in batch using Firebase Admin SDK
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {uploadResult ? (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  Bulk Creation Complete!
                </div>
                <div className="text-xs space-y-1">
                  <p>Successfully created: <strong>{uploadResult.createdCount} accounts</strong></p>
                  {uploadResult.failedCount > 0 && (
                    <p className="text-rose-600">Failed / Skipped: <strong>{uploadResult.failedCount} records</strong></p>
                  )}
                </div>
              </div>

              {uploadResult.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-[11px] text-zinc-600 dark:text-zinc-400 max-h-32 overflow-y-auto space-y-1 font-mono">
                  {uploadResult.errors.map((err, i) => (
                    <div key={i}>• {err}</div>
                  ))}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleDownloadReport}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-xs font-semibold text-zinc-800 dark:text-zinc-200 transition"
                >
                  <Download className="h-4 w-4" />
                  Download Credentials CSV
                </button>
                <button
                  onClick={handleClose}
                  className="flex-1 py-2.5 rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 text-xs font-semibold hover:opacity-90 transition"
                >
                  Finish
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* File Upload Box */}
              <div className="border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl p-6 text-center hover:border-zinc-400 dark:hover:border-zinc-600 transition">
                <input
                  type="file"
                  id="csvFileInput"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <label
                  htmlFor="csvFileInput"
                  className="cursor-pointer flex flex-col items-center justify-center gap-2"
                >
                  <div className="h-10 w-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400">
                    <Upload className="h-5 w-5" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                      Click to choose CSV file
                    </span>
                    <span className="text-xs text-zinc-500"> or drag and drop</span>
                  </div>
                  <span className="text-[11px] text-zinc-400">
                    Requires columns: Name, Email, Department, Roll Number (Roll Number will be used as password)
                  </span>
                </label>
              </div>

              {/* Notice Banner */}
              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-700 dark:text-blue-300 text-xs flex items-center gap-2">
                <span>💡</span>
                <span>
                  <strong>Student Password:</strong> Each student&apos;s <strong>Roll / Register Number</strong> (min. 6 characters) will automatically be assigned as their initial login password.
                </span>
              </div>

              {/* Sample Download Bar */}
              <div className="flex items-center justify-between text-xs px-1">
                <span className="text-zinc-500">Need the correct column format?</span>
                <button
                  type="button"
                  onClick={handleDownloadSample}
                  className="flex items-center gap-1.5 font-medium text-blue-600 hover:text-blue-500"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Sample CSV
                </button>
              </div>

              {parseError && (
                <div className="p-3 text-xs rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  <span>{parseError}</span>
                </div>
              )}

              {/* Preview Table */}
              {parsedData.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      Previewing {parsedData.length} Students
                    </span>
                    <span className="text-[11px] text-zinc-400 font-mono">{fileName}</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-zinc-200 dark:border-zinc-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-zinc-50 dark:bg-zinc-800/60 text-zinc-500 text-[10px] uppercase font-semibold">
                        <tr>
                          <th className="p-2.5">Name</th>
                          <th className="p-2.5">Email</th>
                          <th className="p-2.5">Department</th>
                          <th className="p-2.5">Roll No (Password)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {parsedData.slice(0, 10).map((row, i) => (
                          <tr key={i} className="text-zinc-800 dark:text-zinc-200">
                            <td className="p-2.5 font-medium">{row.displayName}</td>
                            <td className="p-2.5 font-mono text-[11px]">{row.email}</td>
                            <td className="p-2.5">{row.department}</td>
                            <td className="p-2.5 font-mono text-[11px]">
                              {row.rollNumber ? (
                                row.rollNumber.length < 6 ? (
                                  <span className="text-amber-600 font-semibold" title="Minimum 6 characters required by Firebase Auth">
                                    {row.rollNumber} (⚠️ &lt; 6 chars)
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 dark:text-emerald-400 font-medium">
                                    {row.rollNumber}
                                  </span>
                                )
                              ) : (
                                <span className="text-rose-600 font-semibold">Missing (Required)</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedData.length > 10 && (
                    <p className="text-[11px] text-zinc-400 text-center">
                      + {parsedData.length - 10} more records ready to import
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-200 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleProcessUpload}
                  disabled={uploading || parsedData.length === 0}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 hover:opacity-90 transition disabled:opacity-40 shadow-sm"
                >
                  {uploading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Provisioning {parsedData.length} Users...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Import & Create Accounts
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
