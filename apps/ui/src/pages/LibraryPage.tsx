import { useState } from 'react';
import { useLibraryClips, useLibraryExports, useDeleteClip, useDeleteExport, openFolder } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, FolderOpen, Trash2, Play, FileAudio, Music2 } from 'lucide-react';
import { formatDuration, formatFileSize, truncateText } from '@/lib/utils';
import type { LibraryClip, LibraryExport } from '@umf-tts/shared';

export function LibraryPage() {
  const { data: clips, isLoading: clipsLoading, refetch: refetchClips } = useLibraryClips();
  const { data: exports, isLoading: exportsLoading, refetch: refetchExports } = useLibraryExports();
  const deleteClip = useDeleteClip();
  const deleteExport = useDeleteExport();

  const [deleteItem, setDeleteItem] = useState<{ type: 'clip' | 'export'; id: string } | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

  const handlePlay = async (filePath: string, id: string) => {
    if (playingId === id && audioRef) {
      audioRef.pause();
      setPlayingId(null);
      return;
    }

    if (audioRef) {
      audioRef.pause();
    }

    const audio = new Audio(`file://${filePath}`);
    audio.onended = () => setPlayingId(null);
    audio.onerror = () => {
      toast({ title: 'Error', description: 'Failed to play audio file', variant: 'destructive' });
      setPlayingId(null);
    };
    audio.play();
    setAudioRef(audio);
    setPlayingId(id);
  };

  const handleOpenFolder = async (filePath: string) => {
    try {
      await openFolder(filePath);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to open folder', variant: 'destructive' });
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;

    try {
      if (deleteItem.type === 'clip') {
        await deleteClip.mutateAsync(deleteItem.id);
        refetchClips();
      } else {
        await deleteExport.mutateAsync(deleteItem.id);
        refetchExports();
      }
      toast({ title: 'Deleted', description: 'Item has been deleted' });
      setDeleteItem(null);
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const isLoading = clipsLoading || exportsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground">Manage your generated clips and exports</p>
      </div>

      <Tabs defaultValue="exports">
        <TabsList>
          <TabsTrigger value="exports">
            <Music2 className="h-4 w-4 mr-2" />
            Exports ({exports?.length ?? 0})
          </TabsTrigger>
          <TabsTrigger value="clips">
            <FileAudio className="h-4 w-4 mr-2" />
            Clips ({clips?.length ?? 0})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="exports" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Merged Exports</CardTitle>
              <CardDescription>Final merged audio files from your projects</CardDescription>
            </CardHeader>
            <CardContent>
              {exports?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Music2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No exports yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate and merge clips from your projects to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {exports?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Music2 className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">
                            {item.filePath.split(/[/\\]/).pop()}
                          </p>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            {item.projectName && <span>{item.projectName}</span>}
                            {item.duration && <span>{formatDuration(item.duration)}</span>}
                            <span>{formatFileSize(item.fileSize)}</span>
                            {item.lineCount && <span>{item.lineCount} lines</span>}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePlay(item.filePath, item.id)}
                        >
                          <Play className={`h-4 w-4 ${playingId === item.id ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenFolder(item.filePath)}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteItem({ type: 'export', id: item.id })}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clips" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Clips</CardTitle>
              <CardDescription>Audio clips generated for each line</CardDescription>
            </CardHeader>
            <CardContent>
              {clips?.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <FileAudio className="h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No clips yet</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Generate clips from your projects to see them here
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {clips?.map((clip) => (
                    <div
                      key={clip.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <span className="text-sm text-muted-foreground w-8 text-center">
                          {clip.lineNo}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{truncateText(clip.text, 60)}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            {clip.projectName && <span>{clip.projectName}</span>}
                            {clip.duration && <span>{formatDuration(clip.duration)}</span>}
                            <span>{formatFileSize(clip.fileSize)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handlePlay(clip.filePath, clip.id)}
                        >
                          <Play className={`h-3 w-3 ${playingId === clip.id ? 'text-primary' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenFolder(clip.filePath)}
                        >
                          <FolderOpen className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setDeleteItem({ type: 'clip', id: clip.id })}
                        >
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteItem} onOpenChange={() => setDeleteItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteItem?.type === 'clip' ? 'Clip' : 'Export'}</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this {deleteItem?.type}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteItem(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteClip.isPending || deleteExport.isPending}
            >
              {(deleteClip.isPending || deleteExport.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
