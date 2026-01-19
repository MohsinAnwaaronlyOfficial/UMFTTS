import { useState } from 'react';
import { useSettings, useUpdateSettings, useTestApiKey, useVoices, useModels, usePresets, useCreatePreset, useUpdatePreset, useDeletePreset } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Check, X, Plus, Pencil, Trash2 } from 'lucide-react';
import type { VoicePreset } from '@umf-tts/shared';

export function SettingsPage() {
  const { data: settings, isLoading: settingsLoading } = useSettings();
  const { data: voices } = useVoices();
  const { data: models } = useModels();
  const { data: presets } = usePresets();
  const updateSettings = useUpdateSettings();
  const testApiKey = useTestApiKey();
  const createPreset = useCreatePreset();
  const updatePreset = useUpdatePreset();
  const deletePreset = useDeletePreset();

  const [apiKeyInput, setApiKeyInput] = useState('');
  const [presetDialogOpen, setPresetDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<VoicePreset | null>(null);

  const handleTestApiKey = async () => {
    if (!apiKeyInput.trim()) {
      toast({ title: 'Error', description: 'Please enter an API key', variant: 'destructive' });
      return;
    }

    try {
      const isValid = await testApiKey.mutateAsync(apiKeyInput);
      if (isValid) {
        toast({ title: 'Success', description: 'API key is valid and saved!', variant: 'success' });
        setApiKeyInput('');
      } else {
        toast({ title: 'Invalid API Key', description: 'The API key is not valid', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const handleSettingChange = async (key: string, value: unknown) => {
    try {
      await updateSettings.mutateAsync({ [key]: value });
      toast({ title: 'Settings Updated', description: `${key} has been updated` });
    } catch (error) {
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  if (settingsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Configure your UMF TTS application</p>
      </div>

      {/* API Key Section */}
      <Card>
        <CardHeader>
          <CardTitle>ElevenLabs API Key</CardTitle>
          <CardDescription>
            Enter your ElevenLabs API key to enable text-to-speech generation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            {settings?.apiKey ? (
              <div className="flex items-center gap-2 text-green-600">
                <Check className="h-4 w-4" />
                <span className="text-sm">API key configured</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600">
                <X className="h-4 w-4" />
                <span className="text-sm">API key not set</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Input
              type="password"
              placeholder="Enter your ElevenLabs API key"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleTestApiKey} disabled={testApiKey.isPending}>
              {testApiKey.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Test & Save
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Default Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Default Settings</CardTitle>
          <CardDescription>Configure default values for new projects</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Default Voice</Label>
              <Select
                value={settings?.defaultVoiceId ?? ''}
                onValueChange={(value) => handleSettingChange('defaultVoiceId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a voice" />
                </SelectTrigger>
                <SelectContent>
                  {voices?.map((voice) => (
                    <SelectItem key={voice.voice_id} value={voice.voice_id}>
                      {voice.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Default Model</Label>
              <Select
                value={settings?.defaultModelId ?? ''}
                onValueChange={(value) => handleSettingChange('defaultModelId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models?.filter((m) => m.can_do_text_to_speech).map((model) => (
                    <SelectItem key={model.model_id} value={model.model_id}>
                      {model.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Output Format</Label>
              <Select
                value={settings?.defaultOutputFormat ?? 'mp3'}
                onValueChange={(value) => handleSettingChange('defaultOutputFormat', value)}
              >
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

            <div className="space-y-2">
              <Label>Delay Between Clips (ms)</Label>
              <Input
                type="number"
                min={0}
                max={5000}
                value={settings?.defaultDelayMs ?? 500}
                onChange={(e) => handleSettingChange('defaultDelayMs', parseInt(e.target.value))}
              />
            </div>

            <div className="space-y-2">
              <Label>Default Concurrency</Label>
              <Input
                type="number"
                min={1}
                max={10}
                value={settings?.defaultConcurrency ?? 3}
                onChange={(e) => handleSettingChange('defaultConcurrency', parseInt(e.target.value))}
              />
            </div>
          </div>

          <div className="border-t pt-6">
            <h4 className="font-medium mb-4">Default Voice Settings</h4>
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Stability</Label>
                    <span className="text-sm text-muted-foreground">
                      {(settings?.defaultVoiceSettings?.stability ?? 0.5).toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[settings?.defaultVoiceSettings?.stability ?? 0.5]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([value]) =>
                      handleSettingChange('defaultVoiceSettings', {
                        ...settings?.defaultVoiceSettings,
                        stability: value,
                      })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Similarity Boost</Label>
                    <span className="text-sm text-muted-foreground">
                      {(settings?.defaultVoiceSettings?.similarityBoost ?? 0.75).toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[settings?.defaultVoiceSettings?.similarityBoost ?? 0.75]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([value]) =>
                      handleSettingChange('defaultVoiceSettings', {
                        ...settings?.defaultVoiceSettings,
                        similarityBoost: value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Style</Label>
                    <span className="text-sm text-muted-foreground">
                      {(settings?.defaultVoiceSettings?.style ?? 0).toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={[settings?.defaultVoiceSettings?.style ?? 0]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([value]) =>
                      handleSettingChange('defaultVoiceSettings', {
                        ...settings?.defaultVoiceSettings,
                        style: value,
                      })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Use Speaker Boost</Label>
                  <Switch
                    checked={settings?.defaultVoiceSettings?.useSpeakerBoost ?? true}
                    onCheckedChange={(checked) =>
                      handleSettingChange('defaultVoiceSettings', {
                        ...settings?.defaultVoiceSettings,
                        useSpeakerBoost: checked,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Voice Presets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Voice Presets</CardTitle>
            <CardDescription>
              Create presets that can be used with #1, #2, etc. in your text
            </CardDescription>
          </div>
          <Button onClick={() => { setEditingPreset(null); setPresetDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Add Preset
          </Button>
        </CardHeader>
        <CardContent>
          {presets?.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No presets configured. Add a preset to get started.
            </p>
          ) : (
            <div className="space-y-2">
              {presets?.map((preset) => (
                <div
                  key={preset.id}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                      #{preset.presetId}
                    </div>
                    <div>
                      <p className="font-medium">{preset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {voices?.find((v) => v.voice_id === preset.voiceId)?.name ?? preset.voiceId}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => { setEditingPreset(preset); setPresetDialogOpen(true); }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deletePreset.mutate(preset.id!)}
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

      {/* Preset Dialog */}
      <PresetDialog
        open={presetDialogOpen}
        onOpenChange={setPresetDialogOpen}
        preset={editingPreset}
        voices={voices ?? []}
        models={models ?? []}
        onSave={async (data) => {
          if (editingPreset) {
            await updatePreset.mutateAsync({ ...data, id: editingPreset.id! });
          } else {
            await createPreset.mutateAsync(data);
          }
          setPresetDialogOpen(false);
          toast({ title: 'Preset Saved', description: `Preset #${data.presetId} has been saved` });
        }}
        existingPresetIds={presets?.map((p) => p.presetId) ?? []}
      />
    </div>
  );
}

interface PresetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: VoicePreset | null;
  voices: { voice_id: string; name: string }[];
  models: { model_id: string; name: string }[];
  onSave: (data: Omit<VoicePreset, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  existingPresetIds: number[];
}

function PresetDialog({ open, onOpenChange, preset, voices, models, onSave, existingPresetIds }: PresetDialogProps) {
  const [formData, setFormData] = useState<Partial<VoicePreset>>({});
  const [saving, setSaving] = useState(false);

  const data = {
    presetId: formData.presetId ?? preset?.presetId ?? 1,
    name: formData.name ?? preset?.name ?? '',
    voiceId: formData.voiceId ?? preset?.voiceId ?? '',
    modelId: formData.modelId ?? preset?.modelId ?? 'eleven_multilingual_v2',
    stability: formData.stability ?? preset?.stability ?? 0.5,
    similarityBoost: formData.similarityBoost ?? preset?.similarityBoost ?? 0.75,
    style: formData.style ?? preset?.style ?? 0,
    useSpeakerBoost: formData.useSpeakerBoost ?? preset?.useSpeakerBoost ?? true,
  };

  const availablePresetIds = Array.from({ length: 10 }, (_, i) => i + 1).filter(
    (id) => !existingPresetIds.includes(id) || id === preset?.presetId
  );

  const handleSave = async () => {
    if (!data.name || !data.voiceId) {
      toast({ title: 'Error', description: 'Please fill in all required fields', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      await onSave(data);
      setFormData({});
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{preset ? 'Edit Preset' : 'Create Preset'}</DialogTitle>
          <DialogDescription>
            Configure a voice preset that can be referenced with #{data.presetId} in your text.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Preset Number</Label>
              <Select
                value={String(data.presetId)}
                onValueChange={(v) => setFormData({ ...formData, presetId: parseInt(v) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePresetIds.map((id) => (
                    <SelectItem key={id} value={String(id)}>
                      #{id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={data.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Narrator"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Voice</Label>
            <Select
              value={data.voiceId}
              onValueChange={(v) => setFormData({ ...formData, voiceId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a voice" />
              </SelectTrigger>
              <SelectContent>
                {voices.map((voice) => (
                  <SelectItem key={voice.voice_id} value={voice.voice_id}>
                    {voice.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Model</Label>
            <Select
              value={data.modelId}
              onValueChange={(v) => setFormData({ ...formData, modelId: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.model_id} value={model.model_id}>
                    {model.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Stability: {data.stability.toFixed(2)}</Label>
              </div>
              <Slider
                value={[data.stability]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => setFormData({ ...formData, stability: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Similarity Boost: {data.similarityBoost.toFixed(2)}</Label>
              </div>
              <Slider
                value={[data.similarityBoost]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => setFormData({ ...formData, similarityBoost: v })}
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Style: {data.style.toFixed(2)}</Label>
              </div>
              <Slider
                value={[data.style]}
                min={0}
                max={1}
                step={0.01}
                onValueChange={([v]) => setFormData({ ...formData, style: v })}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label>Speaker Boost</Label>
              <Switch
                checked={data.useSpeakerBoost}
                onCheckedChange={(v) => setFormData({ ...formData, useSpeakerBoost: v })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
