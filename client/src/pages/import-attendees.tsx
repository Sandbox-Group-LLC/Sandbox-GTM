import { useState, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import ExcelJS from "exceljs";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Upload,
  FileSpreadsheet,
  Link as LinkIcon,
  Check,
  X,
  AlertCircle,
  Download,
  Loader2,
  Users,
} from "lucide-react";
import { EventSelectField } from "@/components/event-select-field";
import type { Event } from "@shared/schema";

const ATTENDEE_TYPE_OPTIONS = [
  { value: "attendee", label: "Attendee" },
  { value: "vendor", label: "Vendor" },
  { value: "employee", label: "Employee" },
  { value: "press_media", label: "Press & Media" },
  { value: "analyst", label: "Analyst" },
  { value: "sponsor", label: "Sponsor" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "waitlist", label: "Waitlist" },
  { value: "cancelled", label: "Cancelled" },
];

const REQUIRED_COLUMNS = ["firstName", "lastName", "email"];
const OPTIONAL_COLUMNS = ["phone", "company", "jobTitle", "attendeeType", "ticketType", "registrationStatus", "notes"];
const ALL_COLUMNS = [...REQUIRED_COLUMNS, ...OPTIONAL_COLUMNS];

interface ParsedRow {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  jobTitle?: string;
  attendeeType?: string;
  ticketType?: string;
  registrationStatus?: string;
  notes?: string;
  isValid: boolean;
  errors: string[];
}

interface ImportResult {
  success: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

const googleSheetsFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
  sheetUrl: z.string().url("Please enter a valid Google Sheets URL"),
});

type GoogleSheetsFormData = z.infer<typeof googleSheetsFormSchema>;

const excelFormSchema = z.object({
  eventId: z.string().min(1, "Event is required"),
});

type ExcelFormData = z.infer<typeof excelFormSchema>;

export default function ImportAttendees() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("excel");
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);

  const { data: events = [] } = useQuery<Event[]>({
    queryKey: ["/api/events"],
  });

  const excelForm = useForm<ExcelFormData>({
    resolver: zodResolver(excelFormSchema),
    defaultValues: {
      eventId: "",
    },
  });

  const googleSheetsForm = useForm<GoogleSheetsFormData>({
    resolver: zodResolver(googleSheetsFormSchema),
    defaultValues: {
      eventId: "",
      sheetUrl: "",
    },
  });

  const importMutation = useMutation({
    mutationFn: async (data: { eventId: string; attendees: ParsedRow[] }) => {
      return await apiRequest("POST", "/api/attendees/bulk-import", data);
    },
    onSuccess: (data: ImportResult) => {
      setImportResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/attendees"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Import completed",
        description: `${data.success} attendees imported successfully${data.failed > 0 ? `, ${data.failed} failed` : ""}`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateRow = (row: Record<string, string>): ParsedRow => {
    const errors: string[] = [];
    
    const firstName = row[columnMapping.firstName] || row.firstName || row["First Name"] || "";
    const lastName = row[columnMapping.lastName] || row.lastName || row["Last Name"] || "";
    const email = row[columnMapping.email] || row.email || row.Email || "";
    
    if (!firstName.trim()) errors.push("First name is required");
    if (!lastName.trim()) errors.push("Last name is required");
    if (!email.trim()) errors.push("Email is required");
    else if (!validateEmail(email.trim())) errors.push("Invalid email format");

    return {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: (row[columnMapping.phone] || row.phone || row.Phone || "").trim() || undefined,
      company: (row[columnMapping.company] || row.company || row.Company || "").trim() || undefined,
      jobTitle: (row[columnMapping.jobTitle] || row.jobTitle || row["Job Title"] || "").trim() || undefined,
      attendeeType: (row[columnMapping.attendeeType] || row.attendeeType || row["Attendee Type"] || "").trim() || undefined,
      ticketType: (row[columnMapping.ticketType] || row.ticketType || row["Ticket Type"] || "").trim() || undefined,
      registrationStatus: (row[columnMapping.registrationStatus] || row.registrationStatus || row.Status || "pending").trim() || "pending",
      notes: (row[columnMapping.notes] || row.notes || row.Notes || "").trim() || undefined,
      isValid: errors.length === 0,
      errors,
    };
  };

  const parseCsvData = useCallback((csvText: string) => {
    const lines = csvText.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return [];
    }
    
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          if (inQuotes && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    const jsonData: Record<string, string>[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const row: Record<string, string> = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx] || '';
      });
      jsonData.push(row);
    }
    
    return jsonData;
  }, []);

  const parseExcelFile = useCallback(async (file: File) => {
    try {
      const isCsv = file.name.toLowerCase().endsWith('.csv');
      let jsonData: Record<string, string>[] = [];
      
      if (isCsv) {
        const text = await file.text();
        jsonData = parseCsvData(text);
      } else {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(arrayBuffer);
        const worksheet = workbook.worksheets[0];
        
        if (!worksheet || worksheet.rowCount === 0) {
          toast({
            title: "Empty file",
            description: "The uploaded file contains no data",
            variant: "destructive",
          });
          return;
        }
        
        const headers: string[] = [];
        const headerRow = worksheet.getRow(1);
        headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
          headers[colNumber - 1] = String(cell.value || `Column${colNumber}`);
        });
        
        for (let rowNum = 2; rowNum <= worksheet.rowCount; rowNum++) {
          const row = worksheet.getRow(rowNum);
          const rowData: Record<string, string> = {};
          let hasData = false;
          
          headers.forEach((header, idx) => {
            const cell = row.getCell(idx + 1);
            const value = cell.value;
            if (value !== null && value !== undefined) {
              hasData = true;
              rowData[header] = String(value);
            } else {
              rowData[header] = '';
            }
          });
          
          if (hasData) {
            jsonData.push(rowData);
          }
        }
      }
      
      if (jsonData.length === 0) {
        toast({
          title: "Empty file",
          description: "The uploaded file contains no data",
          variant: "destructive",
        });
        return;
      }

      const headers = Object.keys(jsonData[0]);
      setRawHeaders(headers);
      setRawData(jsonData);
      
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, "");
        if (lowerHeader.includes("firstname") || lowerHeader === "first") autoMapping.firstName = header;
        else if (lowerHeader.includes("lastname") || lowerHeader === "last") autoMapping.lastName = header;
        else if (lowerHeader.includes("email")) autoMapping.email = header;
        else if (lowerHeader.includes("phone") || lowerHeader.includes("mobile")) autoMapping.phone = header;
        else if (lowerHeader.includes("company") || lowerHeader.includes("organization")) autoMapping.company = header;
        else if (lowerHeader.includes("jobtitle") || lowerHeader.includes("title") || lowerHeader.includes("position")) autoMapping.jobTitle = header;
        else if (lowerHeader.includes("attendeetype") || lowerHeader.includes("type")) autoMapping.attendeeType = header;
        else if (lowerHeader.includes("tickettype") || lowerHeader.includes("ticket")) autoMapping.ticketType = header;
        else if (lowerHeader.includes("status")) autoMapping.registrationStatus = header;
        else if (lowerHeader.includes("notes") || lowerHeader.includes("comments")) autoMapping.notes = header;
      });
      
      setColumnMapping(autoMapping);
      
      const parsed = jsonData.map(row => validateRow(row));
      setParsedData(parsed);
      
      toast({
        title: "File parsed successfully",
        description: `Found ${jsonData.length} rows. Please review the column mapping.`,
      });
    } catch (error) {
      toast({
        title: "Parse error",
        description: "Failed to parse the file. Please ensure it's a valid Excel or CSV file.",
        variant: "destructive",
      });
    }
  }, [toast, columnMapping, parseCsvData]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseExcelFile(file);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setSelectedFile(file);
      parseExcelFile(file);
    }
  }, [parseExcelFile]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const revalidateData = useCallback(() => {
    if (rawData.length > 0) {
      const parsed = rawData.map(row => validateRow(row));
      setParsedData(parsed);
    }
  }, [rawData, columnMapping]);

  const handleColumnMappingChange = (field: string, value: string) => {
    setColumnMapping(prev => ({ ...prev, [field]: value }));
  };

  const handleImport = async (eventId: string) => {
    const validRows = parsedData.filter(row => row.isValid);
    if (validRows.length === 0) {
      toast({
        title: "No valid rows",
        description: "There are no valid rows to import. Please fix the errors and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsImporting(true);
    setImportProgress(0);
    setImportResult(null);

    try {
      const result = await importMutation.mutateAsync({
        eventId,
        attendees: validRows,
      });
      setImportProgress(100);
    } catch (error) {
      setIsImporting(false);
    } finally {
      setIsImporting(false);
    }
  };

  const [isLoadingSheet, setIsLoadingSheet] = useState(false);

  const handleGoogleSheetsImport = async (data: GoogleSheetsFormData) => {
    setIsLoadingSheet(true);
    try {
      const spreadsheetId = extractSpreadsheetId(data.sheetUrl);
      if (!spreadsheetId) {
        toast({
          title: "Invalid URL",
          description: "Could not extract spreadsheet ID from the URL. Please ensure it's a valid Google Sheets URL.",
          variant: "destructive",
        });
        setIsLoadingSheet(false);
        return;
      }

      const csvUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv`;
      
      const response = await fetch(csvUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch the spreadsheet. Make sure it's publicly accessible (Anyone with the link can view).");
      }
      
      const csvText = await response.text();
      
      // Check if response is HTML (Google login page redirect for private sheets)
      if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
        throw new Error("The spreadsheet is not publicly accessible. Please set sharing to 'Anyone with the link can view' in Google Sheets.");
      }
      const jsonData = parseCsvData(csvText);
      
      if (jsonData.length === 0) {
        toast({
          title: "Empty sheet",
          description: "The Google Sheet contains no data",
          variant: "destructive",
        });
        return;
      }

      const headers = Object.keys(jsonData[0]);
      setRawHeaders(headers);
      setRawData(jsonData);
      
      const autoMapping: Record<string, string> = {};
      headers.forEach(header => {
        const lowerHeader = header.toLowerCase().replace(/[^a-z]/g, "");
        if (lowerHeader.includes("firstname") || lowerHeader === "first") autoMapping.firstName = header;
        else if (lowerHeader.includes("lastname") || lowerHeader === "last") autoMapping.lastName = header;
        else if (lowerHeader.includes("email")) autoMapping.email = header;
        else if (lowerHeader.includes("phone") || lowerHeader.includes("mobile")) autoMapping.phone = header;
        else if (lowerHeader.includes("company") || lowerHeader.includes("organization")) autoMapping.company = header;
        else if (lowerHeader.includes("jobtitle") || lowerHeader.includes("title") || lowerHeader.includes("position")) autoMapping.jobTitle = header;
        else if (lowerHeader.includes("attendeetype") || lowerHeader.includes("type")) autoMapping.attendeeType = header;
        else if (lowerHeader.includes("tickettype") || lowerHeader.includes("ticket")) autoMapping.ticketType = header;
        else if (lowerHeader.includes("status")) autoMapping.registrationStatus = header;
        else if (lowerHeader.includes("notes") || lowerHeader.includes("comments")) autoMapping.notes = header;
      });
      
      setColumnMapping(autoMapping);
      
      const parsed = jsonData.map(row => validateRow(row));
      setParsedData(parsed);
      
      toast({
        title: "Sheet loaded successfully",
        description: `Found ${jsonData.length} rows. Please review the column mapping.`,
      });
    } catch (error: any) {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import from Google Sheets",
        variant: "destructive",
      });
    } finally {
      setIsLoadingSheet(false);
    }
  };

  const extractSpreadsheetId = (url: string): string | null => {
    const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
  };

  const downloadTemplate = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Attendees");
    
    worksheet.columns = [
      { header: "firstName", key: "firstName", width: 15 },
      { header: "lastName", key: "lastName", width: 15 },
      { header: "email", key: "email", width: 25 },
      { header: "phone", key: "phone", width: 15 },
      { header: "company", key: "company", width: 20 },
      { header: "jobTitle", key: "jobTitle", width: 20 },
      { header: "attendeeType", key: "attendeeType", width: 15 },
      { header: "ticketType", key: "ticketType", width: 15 },
      { header: "registrationStatus", key: "registrationStatus", width: 18 },
      { header: "notes", key: "notes", width: 30 },
    ];
    
    worksheet.addRow({
      firstName: "John",
      lastName: "Doe",
      email: "john.doe@example.com",
      phone: "+1234567890",
      company: "Acme Inc",
      jobTitle: "Software Engineer",
      attendeeType: "attendee",
      ticketType: "VIP",
      registrationStatus: "confirmed",
      notes: "Special dietary requirements",
    });
    
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendee-import-template.xlsx";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetForm = () => {
    setParsedData([]);
    setColumnMapping({});
    setImportResult(null);
    setSelectedFile(null);
    setRawHeaders([]);
    setRawData([]);
    setImportProgress(0);
    excelForm.reset();
    googleSheetsForm.reset();
  };

  const validCount = parsedData.filter(r => r.isValid).length;
  const invalidCount = parsedData.filter(r => !r.isValid).length;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Import Attendees"
        breadcrumbs={[
          { label: "Attendees", href: "/attendees" },
          { label: "Import" },
        ]}
        actions={
          <Button variant="outline" onClick={downloadTemplate} data-testid="button-download-template">
            <Download className="h-4 w-4 mr-2" />
            Download Template
          </Button>
        }
      />

      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {importResult ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {importResult.failed === 0 ? (
                    <Check className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-yellow-500" />
                  )}
                  Import Complete
                </CardTitle>
                <CardDescription>
                  {importResult.success} attendees imported successfully
                  {importResult.failed > 0 && `, ${importResult.failed} failed`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Badge variant="default" className="text-sm">
                    <Check className="h-3 w-3 mr-1" />
                    {importResult.success} Imported
                  </Badge>
                  {importResult.failed > 0 && (
                    <Badge variant="destructive" className="text-sm">
                      <X className="h-3 w-3 mr-1" />
                      {importResult.failed} Failed
                    </Badge>
                  )}
                </div>
                
                {importResult.errors.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Errors:</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.errors.map((err, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          Row {err.row}: {err.error}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
                
                <Button onClick={resetForm} data-testid="button-import-more">
                  Import More Attendees
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="excel" data-testid="tab-excel">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Excel / CSV
                </TabsTrigger>
                <TabsTrigger value="google-sheets" data-testid="tab-google-sheets">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Google Sheets
                </TabsTrigger>
              </TabsList>

              <TabsContent value="excel" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Upload Excel or CSV File</CardTitle>
                    <CardDescription>
                      Upload a spreadsheet file with attendee data. Supported formats: .xlsx, .xls, .csv
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Form {...excelForm}>
                      <form className="space-y-4">
                        <EventSelectField control={excelForm.control} />
                      </form>
                    </Form>

                    <div
                      className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover-elevate"
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      onClick={() => document.getElementById("file-input")?.click()}
                      data-testid="dropzone-excel"
                    >
                      <input
                        id="file-input"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        className="hidden"
                        onChange={handleFileChange}
                        data-testid="input-file"
                      />
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
                      <p className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : "Drag and drop a file here, or click to browse"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Supports Excel (.xlsx, .xls) and CSV files
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="google-sheets" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Import from Google Sheets</CardTitle>
                    <CardDescription>
                      Paste the URL of a publicly shared Google Sheet. The sheet must be accessible to "Anyone with the link".
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...googleSheetsForm}>
                      <form onSubmit={googleSheetsForm.handleSubmit(handleGoogleSheetsImport)} className="space-y-4">
                        <EventSelectField control={googleSheetsForm.control} />
                        
                        <FormField
                          control={googleSheetsForm.control}
                          name="sheetUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Google Sheets URL</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="https://docs.google.com/spreadsheets/d/..."
                                  data-testid="input-google-sheets-url"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Alert>
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle>Important</AlertTitle>
                          <AlertDescription>
                            Make sure your Google Sheet is shared with "Anyone with the link can view" permission.
                          </AlertDescription>
                        </Alert>

                        <Button type="submit" disabled={isLoadingSheet} data-testid="button-load-google-sheet">
                          {isLoadingSheet ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <LinkIcon className="h-4 w-4 mr-2" />
                          )}
                          {isLoadingSheet ? "Loading..." : "Load Sheet"}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {parsedData.length > 0 && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Column Mapping</CardTitle>
                      <CardDescription>
                        Map your spreadsheet columns to attendee fields. Required fields: First Name, Last Name, Email
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {ALL_COLUMNS.map((field) => (
                          <div key={field} className="space-y-2">
                            <label className="text-sm font-medium flex items-center gap-1">
                              {field.replace(/([A-Z])/g, " $1").replace(/^./, str => str.toUpperCase())}
                              {REQUIRED_COLUMNS.includes(field) && (
                                <span className="text-destructive">*</span>
                              )}
                            </label>
                            <Select
                              value={columnMapping[field] || ""}
                              onValueChange={(value) => handleColumnMappingChange(field, value)}
                            >
                              <SelectTrigger data-testid={`select-mapping-${field}`}>
                                <SelectValue placeholder="Select column" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">Not mapped</SelectItem>
                                {rawHeaders.map((header) => (
                                  <SelectItem key={header} value={header}>
                                    {header}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={revalidateData}
                        data-testid="button-revalidate"
                      >
                        Apply Mapping
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between gap-4 flex-wrap">
                        <span>Preview Data</span>
                        <div className="flex gap-2">
                          <Badge variant="default">
                            <Check className="h-3 w-3 mr-1" />
                            {validCount} Valid
                          </Badge>
                          {invalidCount > 0 && (
                            <Badge variant="destructive">
                              <X className="h-3 w-3 mr-1" />
                              {invalidCount} Invalid
                            </Badge>
                          )}
                        </div>
                      </CardTitle>
                      <CardDescription>
                        Review the parsed data before importing. Only valid rows will be imported.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-md overflow-hidden">
                        <div className="max-h-96 overflow-auto">
                          <Table>
                            <TableHeader className="sticky top-0 bg-background z-10">
                              <TableRow>
                                <TableHead className="w-12">Status</TableHead>
                                <TableHead>First Name</TableHead>
                                <TableHead>Last Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Errors</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {parsedData.slice(0, 100).map((row, idx) => (
                                <TableRow key={idx} className={row.isValid ? "" : "bg-destructive/5"}>
                                  <TableCell>
                                    {row.isValid ? (
                                      <Check className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <X className="h-4 w-4 text-destructive" />
                                    )}
                                  </TableCell>
                                  <TableCell>{row.firstName || "-"}</TableCell>
                                  <TableCell>{row.lastName || "-"}</TableCell>
                                  <TableCell>{row.email || "-"}</TableCell>
                                  <TableCell>{row.company || "-"}</TableCell>
                                  <TableCell className="text-destructive text-xs">
                                    {row.errors.join(", ")}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                      {parsedData.length > 100 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Showing first 100 of {parsedData.length} rows
                        </p>
                      )}
                    </CardContent>
                  </Card>

                  {isImporting && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-sm">Importing attendees...</span>
                            <span className="text-sm text-muted-foreground">{importProgress}%</span>
                          </div>
                          <Progress value={importProgress} />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-between gap-4 flex-wrap">
                    <Button variant="outline" onClick={resetForm} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        const eventId = activeTab === "excel" 
                          ? excelForm.getValues("eventId") 
                          : googleSheetsForm.getValues("eventId");
                        if (!eventId) {
                          toast({
                            title: "Event required",
                            description: "Please select an event before importing",
                            variant: "destructive",
                          });
                          return;
                        }
                        handleImport(eventId);
                      }}
                      disabled={validCount === 0 || isImporting || importMutation.isPending}
                      data-testid="button-import"
                    >
                      {importMutation.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Users className="h-4 w-4 mr-2" />
                      )}
                      Import {validCount} Attendees
                    </Button>
                  </div>
                </>
              )}
            </Tabs>
          )}
        </div>
      </div>
    </div>
  );
}
