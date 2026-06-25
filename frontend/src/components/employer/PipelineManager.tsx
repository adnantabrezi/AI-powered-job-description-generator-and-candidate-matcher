import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { pipelineApi } from '../../services/api';

interface Props {
  onClose?: () => void;
}

export default function PipelineManager({ onClose }: Props) {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newSkills, setNewSkills] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['pipelines'],
    queryFn: async () => (await pipelineApi.list()).data,
  });

  const { data: selectedPipeline } = useQuery({
    queryKey: ['pipeline', selectedId],
    queryFn: async () => selectedId ? (await pipelineApi.getById(selectedId)).data : null,
    enabled: !!selectedId,
  });

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setError('');
    try {
      await pipelineApi.create({
        name: newName,
        description: newDesc || undefined,
        criteria: newSkills ? { skills: newSkills.split(',').map((s) => s.trim()) } : undefined,
      });
      setNewName('');
      setNewDesc('');
      setNewSkills('');
      setIsCreating(false);
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create pipeline');
    }
  };

  const handleAutoPopulate = async (id: string) => {
    try {
      await pipelineApi.autoPopulate(id);
      queryClient.invalidateQueries({ queryKey: ['pipeline', id] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    } catch {
      /* ignore */
    }
  };

  const handleRemoveCandidate = async (pipelineId: string, candidateId: string) => {
    try {
      await pipelineApi.removeCandidate(pipelineId, candidateId);
      queryClient.invalidateQueries({ queryKey: ['pipeline', pipelineId] });
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await pipelineApi.delete(id);
      if (selectedId === id) setSelectedId(null);
      queryClient.invalidateQueries({ queryKey: ['pipelines'] });
    } catch {
      /* ignore */
    }
  };

  const pipelines = data?.pipelines || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-slate-100">🔄 Talent Pipelines</h2>
        <button onClick={() => setIsCreating(!isCreating)}
          className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 text-xs font-semibold text-indigo-400 hover:bg-indigo-500/20 transition-colors">
          {isCreating ? 'Cancel' : '+ New Pipeline'}
        </button>
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}

      {isCreating && (
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-4 space-y-3">
          <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="Pipeline name (e.g. Frontend Engineers Q3)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          <input type="text" value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          <input type="text" value={newSkills} onChange={(e) => setNewSkills(e.target.value)}
            placeholder="Target skills (comma-separated, for auto-populate)"
            className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm focus:outline-none focus:border-indigo-500" />
          <button onClick={handleCreate} disabled={!newName.trim()}
            className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-400 transition-colors disabled:opacity-40">
            Create Pipeline
          </button>
        </div>
      )}

      {isLoading && <p className="text-sm text-slate-500">Loading pipelines...</p>}

      {/* Pipeline list */}
      <div className="grid gap-3">
        {pipelines.length === 0 && !isLoading && (
          <p className="text-sm text-slate-500">No pipelines yet. Create one to start organizing your talent pool.</p>
        )}
        {pipelines.map((p: any) => (
          <div key={p.id}
            className={`rounded-xl border p-4 transition-colors cursor-pointer ${
              selectedId === p.id
                ? 'border-indigo-500/40 bg-indigo-500/5'
                : 'border-slate-800 bg-slate-900 hover:border-slate-700'
            }`}
            onClick={() => setSelectedId(selectedId === p.id ? null : p.id)}>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-slate-200">{p.name}</p>
                {p.description && <p className="text-xs text-slate-500">{p.description}</p>}
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-400">
                  {p._count?.candidates || 0} candidates
                </span>
                <button onClick={(e) => { e.stopPropagation(); handleAutoPopulate(p.id); }}
                  className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 transition-colors">
                  ✨ Auto-fill
                </button>
                <button onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                  className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors">
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Selected pipeline detail */}
      {selectedId && selectedPipeline && (
        <div className="rounded-xl border border-indigo-500/20 bg-slate-950/50 p-4 space-y-3">
          <h3 className="text-sm font-semibold text-indigo-400">{selectedPipeline.name} — Candidates</h3>
          {(selectedPipeline.candidates || []).length === 0 ? (
            <p className="text-xs text-slate-500">No candidates in this pipeline. Use "Auto-fill" or add candidates from the rankings.</p>
          ) : (
            <div className="space-y-2">
              {(selectedPipeline.candidates || []).map((pc: any) => (
                <div key={pc.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3">
                  <div>
                    <p className="text-sm text-slate-200">{pc.candidate.user?.email || 'Unknown'}</p>
                    {pc.notes && <p className="text-xs text-slate-500">{pc.notes}</p>}
                  </div>
                  <button onClick={() => handleRemoveCandidate(selectedId, pc.candidateId)}
                    className="text-xs text-rose-400/60 hover:text-rose-400 transition-colors">
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
