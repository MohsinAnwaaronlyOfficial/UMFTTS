import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProjects, useCreateProject, useDeleteProject, selectFile, readFile } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Plus, FolderOpen, Trash2, FileText, Play, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { formatDuration, truncateText } from '@/lib/utils';
import type { Project } from '@umf-tts/shared';

export function ProjectsPage() {
  const navigate = useNavigate();
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const deleteProject = useDeleteProject();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);

  const handleCreateProject = async (name: string, rawText: string, inputType: 'text' | 'srt') => {
    try {
      const project = await createProject.mutateAsync({ name, rawText, inputType });
      toast({ title: 'Project Created', description: `"${name}" has been created with ${project.lines.length} lines` });
      setCreateDialogOpen(false);
      navigate(`/generate/${project.id}`);
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const handleDeleteProject = async () => {
    if (!deleteConfirmProject) return;
    try {
      await deleteProject.mutateAsync(deleteConfirmProject.id);
      toast({ title: 'Project Deleted', description: `"${deleteConfirmProject.name}" has been deleted` });
      setDeleteConfirmProject(null);
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const getStatusIcon = (status: Project['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

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
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground">Manage your TTS projects</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {projects?.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center mb-4">
              Create your first project to start generating speech from text.
            </p>
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {projects?.map((project) => (
            <Card key={project.id} className="hover:bg-accent/50 transition-colors">
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium truncate">{project.name}</h3>
                      {getStatusIcon(project.status)}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span>{project.totalLines} lines</span>
                      {project.completedLines > 0 && (
                        <span className="text-green-600">
                          {project.completedLines} completed
                        </span>
                      )}
                      {project.failedLines > 0 && (
                        <span className="text-red-600">
                          {project.failedLines} failed
                        </span>
                      )}
                      <span className="text-xs">
                        {new Date(project.createdAt!).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/generate/${project.id}`)}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Open
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleteConfirmProject(project)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateProject}
        isLoading={createProject.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirmProject} onOpenChange={() => setDeleteConfirmProject(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deleteConfirmProject?.name}"? This action cannot be undone
              and all associated clips will be removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmProject(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject} disabled={deleteProject.isPending}>
              {deleteProject.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface CreateProjectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (name: string, rawText: string, inputType: 'text' | 'srt') => Promise<void>;
  isLoading: boolean;
}

function CreateProjectDialog({ open, onOpenChange, onSubmit, isLoading }: CreateProjectDialogProps) {
  const [name, setName] = useState('');
  const [rawText, setRawText] = useState('');
  const [inputType, setInputType] = useState<'text' | 'srt'>('text');
  const [fileName, setFileName] = useState<string | null>(null);

  const handleFileSelect = async () => {
    const filters = inputType === 'srt'
      ? [{ name: 'SRT Files', extensions: ['srt'] }]
      : [{ name: 'Text Files', extensions: ['txt'] }];

    const files = await selectFile({ title: 'Select File', filters });
    if (files.length > 0) {
      const content = await readFile(files[0]!);
      setRawText(content);
      setFileName(files[0]!.split(/[/\\]/).pop() ?? null);
      if (!name) {
        setName(fileName?.replace(/\.(txt|srt)$/i, '') ?? '');
      }
    }
  };

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({ title: 'Error', description: 'Please enter a project name', variant: 'destructive' });
      return;
    }
    if (!rawText.trim()) {
      toast({ title: 'Error', description: 'Please enter or upload some text', variant: 'destructive' });
      return;
    }
    await onSubmit(name.trim(), rawText, inputType);
    setName('');
    setRawText('');
    setFileName(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Project</DialogTitle>
          <DialogDescription>
            Enter or upload text to create a new TTS project. Use #1, #2, etc. to assign voice presets to specific lines.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Project Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My TTS Project"
            />
          </div>

          <Tabs value={inputType} onValueChange={(v) => setInputType(v as 'text' | 'srt')}>
            <TabsList>
              <TabsTrigger value="text">Plain Text</TabsTrigger>
              <TabsTrigger value="srt">SRT Subtitles</TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleFileSelect}>
                  Upload .txt file
                </Button>
                {fileName && (
                  <span className="text-sm text-muted-foreground flex items-center">
                    {fileName}
                  </span>
                )}
              </div>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Enter text here, one line per speech segment...

Use #1, #2 etc. at the start of a line to use voice presets:
Hello, welcome to our podcast!
#1 This line will use preset 1
#2 And this line will use preset 2"
                className="min-h-[200px] font-mono text-sm"
              />
            </TabsContent>

            <TabsContent value="srt" className="space-y-4">
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleFileSelect}>
                  Upload .srt file
                </Button>
                {fileName && (
                  <span className="text-sm text-muted-foreground flex items-center">
                    {fileName}
                  </span>
                )}
              </div>
              <Textarea
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="1
00:00:00,000 --> 00:00:05,000
First subtitle line

2
00:00:05,500 --> 00:00:10,000
#1 This uses preset 1"
                className="min-h-[200px] font-mono text-sm"
              />
            </TabsContent>
          </Tabs>

          <div className="text-sm text-muted-foreground">
            <p className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Empty lines will be ignored. Each non-empty line becomes a speech segment.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Project
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
