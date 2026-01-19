import { useState } from 'react';
import { useVoices, useCloneVoice, useDeleteVoice, selectFile } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, Upload, Trash2, Mic2, AlertTriangle, X } from 'lucide-react';

export function VoiceCloningPage() {
  const { data: voices, isLoading, refetch } = useVoices();
  const cloneVoice = useCloneVoice();
  const deleteVoice = useDeleteVoice();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteVoiceId, setDeleteVoiceId] = useState<string | null>(null);
  const [voiceName, setVoiceName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);

  const handleSelectFiles = async () => {
    const files = await selectFile({
      title: 'Select Voice Samples',
      filters: [{ name: 'Audio Files', extensions: ['mp3', 'wav', 'm4a', 'ogg', 'flac'] }],
      multiple: true,
    });
    if (files.length > 0) {
      setSelectedFiles((prev) => [...prev, ...files].slice(0, 25)); // Max 25 files
    }
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCloneVoice = async () => {
    if (!voiceName.trim()) {
      toast({ title: 'Error', description: 'Please enter a voice name', variant: 'destructive' });
      return;
    }
    if (selectedFiles.length === 0) {
      toast({ title: 'Error', description: 'Please select at least one audio sample', variant: 'destructive' });
      return;
    }

    try {
      await cloneVoice.mutateAsync({
        name: voiceName.trim(),
        filePaths: selectedFiles,
        description: description.trim() || undefined,
      });
      toast({ title: 'Voice Cloned', description: `"${voiceName}" has been created successfully!`, variant: 'success' });
      setCreateDialogOpen(false);
      setVoiceName('');
      setDescription('');
      setSelectedFiles([]);
      refetch();
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const handleDeleteVoice = async () => {
    if (!deleteVoiceId) return;
    try {
      await deleteVoice.mutateAsync(deleteVoiceId);
      toast({ title: 'Voice Deleted', description: 'The voice has been deleted from your account' });
      setDeleteVoiceId(null);
      refetch();
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  // Filter to show only cloned voices (those you can delete)
  const clonedVoices = voices?.filter((v) => v.category === 'cloned' || v.category === 'generated') ?? [];
  const allVoices = voices ?? [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Voice Cloning</h1>
          <p className="text-muted-foreground">Clone voices from audio samples using ElevenLabs</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Clone Voice
        </Button>
      </div>

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
        <CardContent className="flex items-start gap-4 pt-6">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-amber-800 dark:text-amber-200">Important Notice</p>
            <p className="text-amber-700 dark:text-amber-300 mt-1">
              Only clone voices that you own or have explicit permission to use. Unauthorized voice
              cloning may violate laws and ElevenLabs terms of service. You are responsible for
              ensuring you have proper consent from the voice owner.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Cloned Voices */}
      <Card>
        <CardHeader>
          <CardTitle>Your Cloned Voices</CardTitle>
          <CardDescription>Voices you have cloned using your ElevenLabs account</CardDescription>
        </CardHeader>
        <CardContent>
          {clonedVoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Mic2 className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No cloned voices yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Clone Voice" to create your first voice clone
              </p>
            </div>
          ) : (
            <div className="grid gap-3">
              {clonedVoices.map((voice) => (
                <div
                  key={voice.voice_id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Mic2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{voice.name}</p>
                      {voice.description && (
                        <p className="text-sm text-muted-foreground">{voice.description}</p>
                      )}
                      <div className="flex gap-2 mt-1">
                        {voice.labels &&
                          Object.entries(voice.labels).map(([key, value]) => (
                            <span
                              key={key}
                              className="text-xs px-2 py-0.5 bg-secondary rounded-full"
                            >
                              {key}: {value}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteVoiceId(voice.voice_id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* All Available Voices */}
      <Card>
        <CardHeader>
          <CardTitle>All Available Voices</CardTitle>
          <CardDescription>All voices available in your ElevenLabs account</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
            {allVoices.map((voice) => (
              <div
                key={voice.voice_id}
                className="flex items-center gap-3 p-3 border rounded-lg"
              >
                <Mic2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{voice.name}</p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {voice.category || 'premade'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Clone Voice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Clone Voice</DialogTitle>
            <DialogDescription>
              Upload audio samples to create a new voice clone. Use high-quality, clear audio
              recordings for best results.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Voice Name</Label>
              <Input
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="e.g., My Custom Voice"
              />
            </div>

            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the voice characteristics..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Audio Samples</Label>
              <div className="border rounded-lg p-4 space-y-3">
                <Button variant="outline" onClick={handleSelectFiles} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Select Audio Files
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  MP3, WAV, M4A, OGG, or FLAC • Up to 25 files • 10MB each
                </p>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between text-sm bg-secondary/50 rounded px-3 py-2"
                      >
                        <span className="truncate flex-1">
                          {file.split(/[/\\]/).pop()}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 ml-2"
                          onClick={() => handleRemoveFile(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Tips for best results:</strong>
              </p>
              <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                <li>Use clear, high-quality recordings without background noise</li>
                <li>Include at least 1 minute of audio total</li>
                <li>Use consistent audio quality across all samples</li>
                <li>Speech should be natural and expressive</li>
              </ul>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCloneVoice} disabled={cloneVoice.isPending}>
              {cloneVoice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Clone Voice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteVoiceId} onOpenChange={() => setDeleteVoiceId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voice</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this voice? This action cannot be undone and the voice
              will be permanently removed from your ElevenLabs account.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteVoiceId(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteVoice} disabled={deleteVoice.isPending}>
              {deleteVoice.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete Voice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
