import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useStartBatch, useCancelBatch, useRetryFailedBatch, useMergeAudio, useSettings, usePresets } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Loader2, Play, Square, RotateCcw, Download, CheckCircle, XCircle, Clock, AudioLines, FolderOpen } from 'lucide-react';
import { cn, truncateText, formatDuration } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import type { BatchProgress, BatchLineUpdate, ProjectLine } from '@umf-tts/shared';

export function GeneratePage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: project, isLoading, refetch } = useProject(projectId);
  const { data: settings } = useSettings();
  const { data: presets } = usePresets();
  const startBatch = useStartBatch();
  const cancelBatch = useCancelBatch();
  const retryFailed = useRetryFailedBatch();
  const mergeAudio = useMergeAudio();

  const [concurrency, setConcurrency] = useState(3);
  const [delayMs, setDelayMs] = useState(500);
  const [outputFormat, setOutputFormat] = useState<'mp3' | 'wav' | 'ogg'>('mp3');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<BatchProgress | null>(null);
  const [lines, setLines] = useState<ProjectLine[]>([]);

  // Initialize from settings
  useEffect(() => {
    if (settings) {
      setConcurrency(settings.defaultConcurrency);
      setDelayMs(settings.defaultDelayMs);
      setOutputFormat(settings.defaultOutputFormat);
    }
  }, [settings]);

  // Initialize lines from project
  useEffect(() => {
    if (project?.lines) {
      setLines(project.lines);
    }
  }, [project]);

  // Set up event listeners for batch updates
  useEffect(() => {
    const unsubProgress = window.electronAPI.onBatchProgress((_, data) => {
      const progressData = data as BatchProgress;
      if (progressData.projectId === projectId) {
        setProgress(progressData);
      }
    });

    const unsubLineUpdate = window.electronAPI.onBatchLineUpdate((_, data) => {
      const update = data as BatchLineUpdate;
      if (update.projectId === projectId) {
        setLines((prev) =>
          prev.map((line) =>
            line.id === update.lineId
              ? { ...line, status: update.status, error: update.error, clipPath: update.clipPath, duration: update.duration }
              : line
          )
        );
      }
    });

    const unsubComplete = window.electronAPI.onBatchComplete((_, data) => {
      const complete = data as { projectId: string; status: string };
      if (complete.projectId === projectId) {
        setIsProcessing(false);
        refetch();
        if (complete.status === 'completed') {
          toast({ title: 'Generation Complete', description: 'All clips have been generated successfully!', variant: 'success' });
        } else {
          toast({ title: 'Generation Finished', description: 'Some clips may have failed. Check the list below.', variant: 'default' });
        }
      }
    });

    return () => {
      unsubProgress();
      unsubLineUpdate();
      unsubComplete();
    };
  }, [projectId, refetch]);

  const handleStart = async () => {
    if (!projectId) return;
    setIsProcessing(true);
    try {
      await startBatch.mutateAsync({ projectId, concurrency });
    } catch (error) {
      setIsProcessing(false);
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const handleCancel = async () => {
    if (!projectId) return;
    try {
      await cancelBatch.mutateAsync(projectId);
      setIsProcessing(false);
      toast({ title: 'Cancelled', description: 'Batch processing has been cancelled' });
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const handleRetryFailed = async () => {
    if (!projectId) return;
    try {
      const count = await retryFailed.mutateAsync(projectId);
      toast({ title: 'Retrying', description: `${count} failed items reset to pending` });
      refetch();
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const handleMerge = async () => {
    if (!projectId) return;
    try {
      const result = await mergeAudio.mutateAsync({ projectId, delayMs, outputFormat });
      toast({
        title: 'Export Complete',
        description: `Merged audio saved (${formatDuration(result.duration)})`,
        variant: 'success',
      });
      window.electronAPI.openFolder(result.outputPath);
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: ProjectLine['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPresetName = (presetId: number | null) => {
    if (!presetId) return null;
    const preset = presets?.find((p) => p.presetId === presetId);
    return preset?.name ?? `Preset #${presetId}`;
  };

  if (!projectId) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AudioLines className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Project Selected</h3>
        <p className="text-muted-foreground text-center mb-4">
          Select a project from the Projects page to start generating.
        </p>
        <Button onClick={() => navigate('/projects')}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Open Projects
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <XCircle className="h-12 w-12 text-destructive mb-4" />
        <h3 className="text-lg font-medium mb-2">Project Not Found</h3>
        <Button onClick={() => navigate('/projects')}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Back to Projects
        </Button>
      </div>
    );
  }

  const completedCount = lines.filter((l) => l.status === 'done').length;
  const failedCount = lines.filter((l) => l.status === 'failed').length;
  const progressPercent = lines.length > 0 ? (completedCount / lines.length) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-muted-foreground">
            {lines.length} lines • {completedCount} completed
            {failedCount > 0 && ` • ${failedCount} failed`}
          </p>
        </div>
        <div className="flex gap-2">
          {failedCount > 0 && !isProcessing && (
            <Button variant="outline" onClick={handleRetryFailed}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Failed
            </Button>
          )}
          {completedCount > 0 && !isProcessing && (
            <Button variant="outline" onClick={handleMerge} disabled={mergeAudio.isPending}>
              {mergeAudio.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export Merged
            </Button>
          )}
          {isProcessing ? (
            <Button variant="destructive" onClick={handleCancel}>
              <Square className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          ) : (
            <Button onClick={handleStart} disabled={completedCount === lines.length}>
              <Play className="h-4 w-4 mr-2" />
              Generate
            </Button>
          )}
        </div>
      </div>

      {/* Progress */}
      {(isProcessing || progressPercent > 0) && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progress</span>
                <span>{Math.round(progressPercent)}%</span>
              </div>
              <Progress value={progressPercent} />
              {progress && (
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Completed: {progress.completed}</span>
                  <span>Processing: {progress.processing}</span>
                  <span>Pending: {progress.pending}</span>
                  {progress.failed > 0 && (
                    <span className="text-red-500">Failed: {progress.failed}</span>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Concurrency</Label>
                <span className="text-sm text-muted-foreground">{concurrency}</span>
              </div>
              <Slider
                value={[concurrency]}
                min={1}
                max={10}
                step={1}
                onValueChange={([v]) => setConcurrency(v)}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label>Clip Delay (ms)</Label>
              <Input
                type="number"
                min={0}
                max={5000}
                value={delayMs}
                onChange={(e) => setDelayMs(parseInt(e.target.value) || 0)}
                disabled={isProcessing}
              />
            </div>
            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select value={outputFormat} onValueChange={(v) => setOutputFormat(v as 'mp3' | 'wav' | 'ogg')} disabled={isProcessing}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mp3">MP3</SelectItem>
                  <SelectItem value="wav">WAV</SelectItem>
                  <SelectItem value="ogg">OGG</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lines List */}
      <Card>
        <CardHeader>
          <CardTitle>Lines</CardTitle>
          <CardDescription>Each line will be converted to a separate audio clip</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 max-h-[400px] overflow-y-auto">
            {lines.map((line) => (
              <div
                key={line.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border transition-colors',
                  line.status === 'processing' && 'bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800',
                  line.status === 'done' && 'bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800',
                  line.status === 'failed' && 'bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800'
                )}
              >
                <span className="w-8 text-center text-sm text-muted-foreground">
                  {line.lineNo}
                </span>
                {getStatusIcon(line.status)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{line.text}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {line.presetId && (
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-full">
                        #{line.presetId} {getPresetName(line.presetId)}
                      </span>
                    )}
                    {line.duration && (
                      <span className="text-xs text-muted-foreground">
                        {formatDuration(line.duration)}
                      </span>
                    )}
                    {line.error && (
                      <span className="text-xs text-red-500 truncate" title={line.error}>
                        {truncateText(line.error, 50)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
