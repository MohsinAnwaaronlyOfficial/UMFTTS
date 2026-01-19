import { useState, useEffect, useRef, useCallback } from 'react';
import { useVoices, useModels, useSettings } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Loader2, Play, Square, Radio, Wifi } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

export function RealtimePreviewPage() {
  const { data: voices } = useVoices();
  const { data: models } = useModels();
  const { data: settings } = useSettings();

  const [text, setText] = useState('');
  const [voiceId, setVoiceId] = useState('');
  const [modelId, setModelId] = useState('eleven_multilingual_v2');
  const [stability, setStability] = useState(0.5);
  const [similarityBoost, setSimilarityBoost] = useState(0.75);
  const [style, setStyle] = useState(0);
  const [useSpeakerBoost, setUseSpeakerBoost] = useState(true);

  const [isStreaming, setIsStreaming] = useState(false);
  const [streamMode, setStreamMode] = useState<'http' | 'websocket'>('http');
  const [sessionId, setSessionId] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const isPlayingRef = useRef(false);

  // Initialize from settings
  useEffect(() => {
    if (settings) {
      if (settings.defaultVoiceId) setVoiceId(settings.defaultVoiceId);
      setModelId(settings.defaultModelId);
      setStability(settings.defaultVoiceSettings.stability);
      setSimilarityBoost(settings.defaultVoiceSettings.similarityBoost);
      setStyle(settings.defaultVoiceSettings.style);
      setUseSpeakerBoost(settings.defaultVoiceSettings.useSpeakerBoost);
    }
  }, [settings]);

  // Initialize AudioContext
  useEffect(() => {
    audioContextRef.current = new AudioContext();
    return () => {
      audioContextRef.current?.close();
    };
  }, []);

  // Play audio chunks
  const playAudioChunk = useCallback(async (base64Data: string) => {
    if (!audioContextRef.current) return;

    const binaryData = atob(base64Data);
    const bytes = new Uint8Array(binaryData.length);
    for (let i = 0; i < binaryData.length; i++) {
      bytes[i] = binaryData.charCodeAt(i);
    }

    audioQueueRef.current.push(bytes.buffer);

    if (!isPlayingRef.current) {
      playNextChunk();
    }
  }, []);

  const playNextChunk = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const audioContext = audioContextRef.current;
    if (!audioContext) return;

    const chunk = audioQueueRef.current.shift();
    if (!chunk) {
      isPlayingRef.current = false;
      return;
    }

    try {
      const audioBuffer = await audioContext.decodeAudioData(chunk.slice(0));
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.destination);
      source.onended = () => {
        playNextChunk();
      };
      source.start();
    } catch (error) {
      console.error('Error decoding audio:', error);
      playNextChunk();
    }
  };

  // Set up event listeners for streaming
  useEffect(() => {
    const unsubHttp = window.electronAPI.onTTSStreamChunk((_, data) => {
      const msg = data as { sessionId: string; chunk?: string; done?: boolean; error?: string };
      if (msg.sessionId !== sessionId) return;

      if (msg.error) {
        setIsStreaming(false);
        toast({ title: 'Streaming Error', description: msg.error, variant: 'destructive' });
      } else if (msg.done) {
        setIsStreaming(false);
      } else if (msg.chunk) {
        playAudioChunk(msg.chunk);
      }
    });

    const unsubWs = window.electronAPI.onWebSocketChunk((_, data) => {
      const msg = data as { sessionId: string; chunk?: string; done?: boolean; error?: string };
      if (msg.sessionId !== sessionId) return;

      if (msg.error) {
        setIsStreaming(false);
        toast({ title: 'WebSocket Error', description: msg.error, variant: 'destructive' });
      } else if (msg.done) {
        setIsStreaming(false);
      } else if (msg.chunk) {
        playAudioChunk(msg.chunk);
      }
    });

    return () => {
      unsubHttp();
      unsubWs();
    };
  }, [sessionId, playAudioChunk]);

  const startHttpStreaming = async () => {
    if (!voiceId || !text.trim()) {
      toast({ title: 'Error', description: 'Please select a voice and enter text', variant: 'destructive' });
      return;
    }

    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setIsStreaming(true);
    audioQueueRef.current = [];

    try {
      await window.electronAPI.startTTSStream(newSessionId, {
        voiceId,
        modelId,
        text: text.trim(),
        stability,
        similarityBoost,
        style,
        useSpeakerBoost,
      });
    } catch (error) {
      setIsStreaming(false);
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const startWebSocketStreaming = async () => {
    if (!voiceId || !text.trim()) {
      toast({ title: 'Error', description: 'Please select a voice and enter text', variant: 'destructive' });
      return;
    }

    const newSessionId = uuidv4();
    setSessionId(newSessionId);
    setIsStreaming(true);
    audioQueueRef.current = [];

    try {
      await window.electronAPI.startWebSocket(newSessionId, {
        voiceId,
        modelId,
        text: text.trim(),
        stability,
        similarityBoost,
        style,
        useSpeakerBoost,
      });

      // Send the text
      await window.electronAPI.sendWebSocketText(newSessionId, text.trim());
      await window.electronAPI.sendWebSocketText(newSessionId, '', true); // flush
    } catch (error) {
      setIsStreaming(false);
      toast({ title: 'Error', description: String(error), variant: 'destructive' });
    }
  };

  const stopStreaming = async () => {
    if (!sessionId) return;

    try {
      if (streamMode === 'http') {
        await window.electronAPI.stopTTSStream(sessionId);
      } else {
        await window.electronAPI.stopWebSocket(sessionId);
      }
    } catch (error) {
      console.error('Error stopping stream:', error);
    }

    setIsStreaming(false);
    audioQueueRef.current = [];
    isPlayingRef.current = false;
  };

  const handlePreview = () => {
    if (streamMode === 'http') {
      startHttpStreaming();
    } else {
      startWebSocketStreaming();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Realtime Preview</h1>
        <p className="text-muted-foreground">
          Preview text-to-speech with live streaming audio playback
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Text Input */}
        <div className="col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Text Input</CardTitle>
              <CardDescription>Enter the text you want to preview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to preview..."
                className="min-h-[200px]"
                disabled={isStreaming}
              />

              <div className="flex items-center gap-4">
                <Tabs value={streamMode} onValueChange={(v) => setStreamMode(v as 'http' | 'websocket')}>
                  <TabsList>
                    <TabsTrigger value="http" disabled={isStreaming}>
                      <Radio className="h-4 w-4 mr-2" />
                      HTTP Stream
                    </TabsTrigger>
                    <TabsTrigger value="websocket" disabled={isStreaming}>
                      <Wifi className="h-4 w-4 mr-2" />
                      WebSocket
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex-1" />

                {isStreaming ? (
                  <Button variant="destructive" onClick={stopStreaming}>
                    <Square className="h-4 w-4 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button onClick={handlePreview} disabled={!voiceId || !text.trim()}>
                    <Play className="h-4 w-4 mr-2" />
                    Preview
                  </Button>
                )}
              </div>

              {isStreaming && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Streaming audio...
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Settings */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Voice Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Voice</Label>
                <Select value={voiceId} onValueChange={setVoiceId} disabled={isStreaming}>
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
                <Label>Model</Label>
                <Select value={modelId} onValueChange={setModelId} disabled={isStreaming}>
                  <SelectTrigger>
                    <SelectValue />
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

              <div className="space-y-4 pt-4 border-t">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Stability</Label>
                    <span className="text-sm text-muted-foreground">{stability.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[stability]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([v]) => setStability(v)}
                    disabled={isStreaming}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Similarity Boost</Label>
                    <span className="text-sm text-muted-foreground">{similarityBoost.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[similarityBoost]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([v]) => setSimilarityBoost(v)}
                    disabled={isStreaming}
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <Label>Style</Label>
                    <span className="text-sm text-muted-foreground">{style.toFixed(2)}</span>
                  </div>
                  <Slider
                    value={[style]}
                    min={0}
                    max={1}
                    step={0.01}
                    onValueChange={([v]) => setStyle(v)}
                    disabled={isStreaming}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label>Speaker Boost</Label>
                  <Switch
                    checked={useSpeakerBoost}
                    onCheckedChange={setUseSpeakerBoost}
                    disabled={isStreaming}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>HTTP Stream:</strong> Standard streaming, buffers more audio before playing.
                </p>
                <p>
                  <strong>WebSocket:</strong> Lower latency, plays audio chunks as they arrive.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
