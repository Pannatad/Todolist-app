import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw } from 'lucide-react';
import { Card, SegmentedControl } from '../ui';
import { toast } from '../ui/Toast';

const PRESETS = [15, 25, 45];

const formatTime = (seconds) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
};

const FocusTimer = ({ task, onComplete }) => {
  const [minutes, setMinutes] = useState(25);
  const [remaining, setRemaining] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const titleRef = useRef(document.title);

  useEffect(() => {
    if (!isRunning) {
      document.title = titleRef.current;
      return undefined;
    }

    document.title = `${formatTime(remaining)} · ${task.title || 'Focus'}`;
    const timer = window.setInterval(() => {
      setRemaining((current) => {
        if (current > 1) return current - 1;
        window.clearInterval(timer);
        setIsRunning(false);
        onComplete(minutes);
        toast('Focus session logged', { tone: 'success' });
        return 0;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [isRunning, minutes, onComplete, remaining, task.title]);

  useEffect(() => () => {
    document.title = titleRef.current;
  }, []);

  const selectMinutes = (nextMinutes) => {
    setMinutes(nextMinutes);
    setRemaining(nextMinutes * 60);
    setIsRunning(false);
  };

  const reset = () => {
    setRemaining(minutes * 60);
    setIsRunning(false);
  };

  return (
    <Card className="space-y-5">
      <div>
        <p className="text-sm text-[var(--color-muted)]">Focus on</p>
        <p className="mt-1 font-semibold text-[var(--color-ink)]">{task.title || 'Untitled task'}</p>
      </div>

      <SegmentedControl
        ariaLabel="Focus duration"
        items={PRESETS.map((preset) => ({ id: String(preset), label: `${preset} min` }))}
        value={String(minutes)}
        onChange={(value) => selectMinutes(Number(value))}
      />

      <div className="text-center text-6xl font-semibold tracking-tight text-[var(--color-ink)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
        {formatTime(remaining)}
      </div>

      <div className="flex justify-center gap-3">
        <button
          type="button"
          onClick={() => setIsRunning((running) => !running)}
          className="ui-button ui-button--accent inline-flex items-center gap-2"
        >
          {isRunning ? <Pause size={17} /> : <Play size={17} />}
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button type="button" onClick={reset} className="ui-button inline-flex items-center gap-2">
          <RotateCcw size={17} /> Reset
        </button>
      </div>
    </Card>
  );
};

export default FocusTimer;
