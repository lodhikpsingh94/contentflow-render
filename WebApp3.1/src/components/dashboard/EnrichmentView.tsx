import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Upload, FileText, CheckCircle, AlertCircle, Clock, Users,
  X, RefreshCw, ChevronRight, Database, Info, History
} from 'lucide-react';
import { uploadEnrichmentData, getUploadHistory, ColumnMapping, UploadHistoryItem, AttributeType } from '../../lib/enrichment';

// ─── CSV parser ───────────────────────────────────────────────────────────────

function parseCSV(text: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length === 0) return { headers: [], rows: [] };

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let field = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        result.push(field.trim()); field = '';
      } else {
        field += ch;
      }
    }
    result.push(field.trim());
    return result;
  };

  const headers = parseRow(lines[0]);
  const rows = lines.slice(1)
    .filter(l => l.trim())
    .map(l => {
      const values = parseRow(l);
      return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? '']));
    });

  return { headers, rows };
}

function coerceValue(raw: string, type: AttributeType): any {
  if (raw === '' || raw === null || raw === undefined) return undefined;
  switch (type) {
    case 'number':  return Number(raw);
    case 'boolean': return raw.toLowerCase() === 'true' || raw === '1';
    case 'date':    return new Date(raw).toISOString();
    default:        return raw;
  }
}

// ─── Steps ───────────────────────────────────────────────────────────────────

type Step = 'upload' | 'mapping' | 'preview' | 'result';

const STEPS: { key: Step; label: string }[] = [
  { key: 'upload',  label: 'Upload File' },
  { key: 'mapping', label: 'Map Columns' },
  { key: 'preview', label: 'Preview' },
  { key: 'result',  label: 'Result' },
];

const ATTR_TYPES: { value: AttributeType; label: string }[] = [
  { value: 'string',  label: 'Text' },
  { value: 'number',  label: 'Number' },
  { value: 'boolean', label: 'Boolean' },
  { value: 'date',    label: 'Date' },
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function EnrichmentView() {
  const [step, setStep] = useState<Step>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [userIdColumn, setUserIdColumn] = useState<string>('');
  const [expiresAt, setExpiresAt] = useState<string>('');
  const [dragging, setDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [history, setHistory] = useState<UploadHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [activeTab, setActiveTab] = useState<'upload' | 'history'>('upload');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getUploadHistory()
      .then(h => setHistory(h))
      .catch(() => {})
      .finally(() => setLoadingHistory(false));
  }, [uploadResult]);

  const handleFile = (f: File) => {
    if (!f.name.endsWith('.csv')) {
      setUploadError('Only CSV files are supported.');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setUploadError('File must be under 10 MB.');
      return;
    }
    setUploadError(null);
    setFile(f);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const result = parseCSV(text);
      setParsed(result);

      // Auto-detect userId column
      const idCol = result.headers.find(h =>
        /^(userid|user_id|id|customerId|customer_id)$/i.test(h)
      ) ?? result.headers[0];
      setUserIdColumn(idCol);

      // Default mappings for non-id columns
      setMappings(
        result.headers
          .filter(h => h !== idCol)
          .map(h => ({ csvHeader: h, attributeName: h.toLowerCase().replace(/\s+/g, '_'), attributeType: 'string', include: true }))
      );
      setStep('mapping');
    };
    reader.readAsText(f);
  };

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const updateMapping = (idx: number, field: keyof ColumnMapping, value: any) => {
    setMappings(prev => prev.map((m, i) => i === idx ? { ...m, [field]: value } : m));
  };

  const handleUpload = async () => {
    if (!parsed || !file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const activeMappings = mappings.filter(m => m.include);
      const attributeTypes: Record<string, AttributeType> = {};
      activeMappings.forEach(m => { attributeTypes[m.attributeName] = m.attributeType; });

      const records = parsed.rows
        .filter(row => row[userIdColumn]?.trim())
        .map(row => {
          const attrs: Record<string, any> = {};
          activeMappings.forEach(m => {
            const raw = row[m.csvHeader];
            const coerced = coerceValue(raw, m.attributeType);
            if (coerced !== undefined) attrs[m.attributeName] = coerced;
          });
          return { userId: row[userIdColumn].trim(), attributes: attrs };
        });

      const result = await uploadEnrichmentData({
        source: 'csv_upload',
        sourceRef: file.name.replace(/[^a-zA-Z0-9._-]/g, '_'),
        attributeTypes,
        expiresAt: expiresAt || undefined,
        records,
      });
      setUploadResult(result);
      setStep('result');
    } catch (err: any) {
      setUploadError(err.message ?? 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const reset = () => {
    setStep('upload'); setFile(null); setParsed(null);
    setMappings([]); setUserIdColumn(''); setExpiresAt('');
    setUploadError(null); setUploadResult(null);
  };

  // ── Step progress indicator ────────────────────────────────────────────────
  const StepBar = () => (
    <div className="flex items-center gap-2 mb-6">
      {STEPS.map((s, i) => {
        const stepIdx = STEPS.findIndex(x => x.key === step);
        const done = i < stepIdx;
        const current = i === stepIdx;
        return (
          <React.Fragment key={s.key}>
            <div className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${current ? 'text-foreground' : done ? 'text-muted-foreground' : 'text-muted-foreground/40'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${current ? 'bg-primary text-primary-foreground' : done ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                {done ? '✓' : i + 1}
              </div>
              <span className="hidden sm:block">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0" />}
          </React.Fragment>
        );
      })}
    </div>
  );

  // ── Upload step ────────────────────────────────────────────────────────────
  const UploadStep = () => (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/20'
        }`}
      >
        <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-lg font-medium mb-1">Drop your CSV file here</p>
        <p className="text-sm text-muted-foreground mb-4">or click to browse your computer</p>
        <Badge variant="outline">Max 10 MB · CSV format only</Badge>
        <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {uploadError}
        </div>
      )}

      <Card className="bg-muted/30 border-0">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Expected CSV format</p>
              <p>First row should be column headers. Include a <code className="bg-muted px-1 rounded">userId</code> column to match records to users.</p>
              <p className="font-mono text-xs bg-muted px-2 py-1 rounded mt-2">
                userId,loyaltyTier,lifetimeValue,crmTag<br />
                user_123,gold,4500,vip_2024<br />
                user_456,platinum,12000,vip_2024
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  // ── Mapping step ───────────────────────────────────────────────────────────
  const MappingStep = () => (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-medium mb-2 block">User ID Column *</Label>
          <Select value={userIdColumn} onValueChange={setUserIdColumn}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(parsed?.headers ?? []).map(h => <SelectItem key={h} value={h}>{h}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground mt-1">The column that identifies each user</p>
        </div>
        <div>
          <Label className="text-sm font-medium mb-2 block">Expires At (optional)</Label>
          <Input type="date" value={expiresAt} onChange={e => setExpiresAt(e.target.value)} />
          <p className="text-xs text-muted-foreground mt-1">Leave blank for no expiry</p>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium mb-3">Attribute Columns</p>
        <div className="space-y-2">
          {mappings.map((m, idx) => (
            <div key={m.csvHeader} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${m.include ? 'bg-card border-border' : 'bg-muted/30 border-border/50 opacity-60'}`}>
              <input
                type="checkbox"
                checked={m.include}
                onChange={e => updateMapping(idx, 'include', e.target.checked)}
                className="w-4 h-4 accent-primary"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground mb-1">CSV column: <code className="bg-muted px-1 rounded">{m.csvHeader}</code></div>
                <Input
                  value={m.attributeName}
                  onChange={e => updateMapping(idx, 'attributeName', e.target.value)}
                  placeholder="attribute name"
                  disabled={!m.include}
                  className="h-7 text-sm"
                />
              </div>
              <Select
                value={m.attributeType}
                onValueChange={v => updateMapping(idx, 'attributeType', v as AttributeType)}
                disabled={!m.include}
              >
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ATTR_TYPES.map(t => <SelectItem key={t.value} value={t.value} className="text-xs">{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={reset}>Back</Button>
        <Button onClick={() => setStep('preview')} disabled={!userIdColumn || mappings.filter(m => m.include).length === 0}>
          Preview Data <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );

  // ── Preview step ───────────────────────────────────────────────────────────
  const PreviewStep = () => {
    if (!parsed) return null;
    const activeMappings = mappings.filter(m => m.include);
    const preview = parsed.rows.slice(0, 5);

    return (
      <div className="space-y-5">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{file?.name}</span>
          <span className="flex items-center gap-1.5"><Users className="w-4 h-4" />{parsed.rows.length.toLocaleString()} records</span>
          <span className="flex items-center gap-1.5"><Database className="w-4 h-4" />{activeMappings.length} attributes</span>
        </div>

        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">userId</th>
                {activeMappings.map(m => (
                  <th key={m.attributeName} className="text-left p-2 font-medium text-muted-foreground whitespace-nowrap">
                    {m.attributeName}
                    <span className="ml-1 text-muted-foreground/60">({m.attributeType})</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, i) => (
                <tr key={i} className="border-t border-border/50 hover:bg-muted/20">
                  <td className="p-2 font-mono">{row[userIdColumn]}</td>
                  {activeMappings.map(m => (
                    <td key={m.attributeName} className="p-2 font-mono text-muted-foreground">
                      {coerceValue(row[m.csvHeader], m.attributeType)?.toString() ?? '—'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {parsed.rows.length > 5 && (
          <p className="text-xs text-muted-foreground">Showing 5 of {parsed.rows.length} rows</p>
        )}

        {uploadError && (
          <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 p-3 rounded-lg">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {uploadError}
          </div>
        )}

        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setStep('mapping')}>Back</Button>
          <Button onClick={handleUpload} disabled={uploading}>
            {uploading ? <><RefreshCw className="w-4 h-4 mr-2 animate-spin" />Uploading…</> : <><Upload className="w-4 h-4 mr-2" />Upload {parsed.rows.length.toLocaleString()} Records</>}
          </Button>
        </div>
      </div>
    );
  };

  // ── Result step ────────────────────────────────────────────────────────────
  const ResultStep = () => {
    if (!uploadResult) return null;
    const { totalRecords, successCount, errorCount, errors, jobRef, uploadedAt } = uploadResult;
    const allOk = errorCount === 0;

    return (
      <div className="space-y-5">
        <div className={`flex items-center gap-3 p-4 rounded-xl ${allOk ? 'bg-green-500/10 border border-green-500/20' : 'bg-yellow-500/10 border border-yellow-500/20'}`}>
          {allOk
            ? <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
            : <AlertCircle className="w-8 h-8 text-yellow-500 shrink-0" />
          }
          <div>
            <p className="font-semibold text-foreground">{allOk ? 'Upload Successful' : 'Upload Completed with Errors'}</p>
            <p className="text-sm text-muted-foreground">
              {successCount.toLocaleString()} of {totalRecords.toLocaleString()} records loaded
              {errorCount > 0 ? ` · ${errorCount} failed` : ''}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Records', value: totalRecords.toLocaleString(), color: 'text-foreground' },
            { label: 'Loaded', value: successCount.toLocaleString(), color: 'text-green-600' },
            { label: 'Failed', value: errorCount.toLocaleString(), color: errorCount > 0 ? 'text-red-500' : 'text-muted-foreground' },
          ].map(stat => (
            <Card key={stat.label} className="bg-card/50 border-0 shadow-sm text-center">
              <CardContent className="p-4">
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          Job reference: <code className="bg-muted px-1 rounded">{jobRef}</code>
          · {new Date(uploadedAt).toLocaleString()}
        </div>

        {errors?.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-2 text-destructive">Failed records (first {Math.min(errors.length, 10)}):</p>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {errors.slice(0, 10).map((e: any, i: number) => (
                <div key={i} className="text-xs flex gap-2 bg-destructive/5 p-2 rounded">
                  <span className="font-mono text-muted-foreground shrink-0">{e.userId}</span>
                  <span className="text-destructive">{e.error}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <Button onClick={reset}><Upload className="w-4 h-4 mr-2" />Upload Another File</Button>
          <Button variant="outline" onClick={() => setActiveTab('history')}>
            <History className="w-4 h-4 mr-2" />View History
          </Button>
        </div>
      </div>
    );
  };

  // ── Upload History ─────────────────────────────────────────────────────────
  const HistoryTab = () => (
    <div>
      {loadingHistory ? (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />)}
        </div>
      ) : history.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-muted-foreground">No uploads yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Source File</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Records</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Attributes</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">Uploaded</th>
                <th className="text-left p-3 text-xs font-medium text-muted-foreground">By</th>
              </tr>
            </thead>
            <tbody>
              {history.map((item, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-muted/20">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="font-mono text-xs truncate max-w-[200px]" title={item.sourceRef}>
                        {item.sourceRef}
                      </span>
                    </div>
                  </td>
                  <td className="p-3 font-medium">{item.recordCount.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground">{item.attributeCount.toLocaleString()}</td>
                  <td className="p-3 text-muted-foreground text-xs">
                    {new Date(item.uploadedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="p-3 text-muted-foreground text-xs font-mono">{item.uploadedBy.slice(0, 14)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Info banner */}
      <Card className="bg-primary/5 border border-primary/20">
        <CardContent className="p-4 flex items-start gap-3">
          <Database className="w-5 h-5 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-foreground mb-1">Enrich User Profiles with External Data</p>
            <p className="text-muted-foreground">
              Upload CSV files to add custom attributes (loyalty tier, lifetime value, CRM tags, etc.) to user profiles.
              These attributes can then be used to build powerful audience segments.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-lg p-1 w-fit">
        {[
          { key: 'upload' as const, label: 'Upload Data', icon: Upload },
          { key: 'history' as const, label: 'Upload History', icon: History },
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'upload' ? (
        <Card className="bg-card/50 border-0 shadow-sm">
          <CardHeader>
            <CardTitle>
              {step === 'upload'  ? 'Select CSV File' :
               step === 'mapping' ? 'Map Columns to Attributes' :
               step === 'preview' ? 'Review & Confirm Upload' :
                                    'Upload Complete'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StepBar />
            {step === 'upload'  && <UploadStep />}
            {step === 'mapping' && <MappingStep />}
            {step === 'preview' && <PreviewStep />}
            {step === 'result'  && <ResultStep />}
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card/50 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Upload History</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => {
              setLoadingHistory(true);
              getUploadHistory().then(h => setHistory(h)).catch(() => {}).finally(() => setLoadingHistory(false));
            }}>
              <RefreshCw className="w-4 h-4 mr-2" />Refresh
            </Button>
          </CardHeader>
          <CardContent>
            <HistoryTab />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
