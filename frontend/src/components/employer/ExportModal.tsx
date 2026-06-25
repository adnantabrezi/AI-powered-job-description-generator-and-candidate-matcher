import { useState } from 'react';
import { exportApi } from '../../services/api';

interface Props {
  jobId: string;
  jobTitle: string;
  onClose: () => void;
}

const PLATFORMS = [
  { key: 'linkedin', label: 'LinkedIn', icon: '🔗', desc: 'Optimized for LinkedIn job posting format' },
  { key: 'indeed', label: 'Indeed', icon: '📋', desc: 'Indeed XML feed format for bulk upload' },
  { key: 'glassdoor', label: 'Glassdoor', icon: '🏢', desc: 'Glassdoor-compatible JSON format' },
  { key: 'html', label: 'HTML', icon: '🌐', desc: 'Clean, styled HTML for any website or email' },
  { key: 'json', label: 'JSON', icon: '{ }', desc: 'Structured JSON for API integrations' },
] as const;

export default function ExportModal({ jobId, jobTitle, onClose }: Props) {
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleExport = async (platform: string) => {
    setSelectedPlatform(platform);
    setIsLoading(true);
    setCopied(false);
    try {
      const res = await exportApi.exportJob(jobId, platform);
      const formatted = typeof res.data.formatted === 'string'
        ? res.data.formatted
        : JSON.stringify(res.data.formatted, null, 2);
      setPreview(formatted);
    } catch {
      setPreview('Failed to generate export.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (preview) {
      navigator.clipboard.writeText(preview);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (preview && selectedPlatform) {
      const extensions: Record<string, string> = {
        linkedin: 'txt', indeed: 'xml', glassdoor: 'json', html: 'html', json: 'json',
      };
      const ext = extensions[selectedPlatform] || 'txt';
      const blob = new Blob([preview], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobTitle.replace(/\s+/g, '_')}_${selectedPlatform}.${ext}`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100">📤 Export Job Posting</h2>
            <p className="text-xs text-slate-500">{jobTitle}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-lg">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Platform selection */}
          <div className="grid grid-cols-5 gap-2">
            {PLATFORMS.map((p) => (
              <button key={p.key} onClick={() => handleExport(p.key)}
                className={`rounded-xl p-3 text-center transition-all border ${
                  selectedPlatform === p.key
                    ? 'border-emerald-500/50 bg-emerald-500/10'
                    : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                }`}>
                <div className="text-2xl mb-1">{p.icon}</div>
                <div className="text-xs font-semibold text-slate-300">{p.label}</div>
              </button>
            ))}
          </div>

          {selectedPlatform && (
            <p className="text-xs text-slate-500">
              {PLATFORMS.find((p) => p.key === selectedPlatform)?.desc}
            </p>
          )}

          {/* Preview */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 rounded-full border-2 border-emerald-500/30 border-t-emerald-500 animate-spin" />
            </div>
          )}

          {preview && !isLoading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase">Preview</span>
                <div className="flex gap-2">
                  <button onClick={handleCopy}
                    className="rounded-lg bg-slate-800 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors">
                    {copied ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  <button onClick={handleDownload}
                    className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                    ⬇ Download
                  </button>
                </div>
              </div>
              <pre className="rounded-lg border border-slate-800 bg-slate-950 p-4 text-xs text-slate-400 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap font-mono">
                {preview.slice(0, 5000)}
                {preview.length > 5000 && '\n\n... (truncated for preview)'}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
