import { NavLink } from 'react-router-dom';
import {
  FolderOpen,
  Waveform,
  Radio,
  Mic2,
  Library,
  Settings,
  AudioLines,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { path: '/projects', label: 'Projects', icon: FolderOpen },
  { path: '/generate', label: 'Generate', icon: Waveform },
  { path: '/preview', label: 'Realtime Preview', icon: Radio },
  { path: '/voice-cloning', label: 'Voice Cloning', icon: Mic2 },
  { path: '/library', label: 'Library', icon: Library },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  return (
    <aside className="w-64 border-r bg-card flex flex-col">
      <div className="p-6 border-b">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <AudioLines className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-lg">UMF TTS</h1>
            <p className="text-xs text-muted-foreground">Text to Speech</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground text-center">
          UMF TTS v1.0.0
        </div>
      </div>
    </aside>
  );
}
