import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Minus, Play, Square, Loader2 } from 'lucide-react';

const THEMES = [
  { name: 'Medieval', icon: '🏰', query: 'medieval ambient music' },
  { name: 'Tavern', icon: '🍺', query: 'fantasy tavern ambient music' },
  { name: 'Fantasy', icon: '🧙‍♂️', query: 'fantasy realm ambient' },
  { name: 'Sci-fi', icon: '🚀', query: 'sci fi atmosphere ambient' },
  { name: 'Jazz', icon: '🎷', query: 'jazz lofi' },
  { name: 'Space', icon: '🌌', query: 'space ambient music' }
];

const PRESET_TIMES = [5, 15, 30];

export default function App() {
  const [minutes, setMinutes] = useState(25);
  const [selectedTheme, setSelectedTheme] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [buttonText, setButtonText] = useState('Show time left');
  const [audio] = useState(new Audio());

  const handleTimeChange = (amount) => {
    const newTime = Math.max(1, Math.min(120, minutes + amount));
    setMinutes(newTime);
  };

  const handleTimeInput = (e) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value)) {
      setMinutes(Math.max(1, Math.min(120, value)));
    }
  };

  const requestNotificationPermission = async () => {
    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  };

  const showNotification = () => {
    new Notification('Focus Timer Complete', {
      body: 'Time to take a break!'
    });
  };

  const handleStart = async () => {
    if (!selectedTheme) {
      alert('Please select a theme first');
      return;
    }

    const hasPermission = await requestNotificationPermission();
    if (!hasPermission) {
      alert('Notifications are required for the timer');
      return;
    }

    setIsLoading(true);
    try {
      const theme = THEMES.find(t => t.name === selectedTheme);
      
      audio.src = `/api/audio?theme=${encodeURIComponent(theme.query)}`;
      await audio.play();
      
      setIsRunning(true);
      setTimeLeft(minutes * 60);
    } catch (error) {
      console.error('Failed to start audio:', error);
      alert('Failed to start audio playback. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStop = () => {
    setIsRunning(false);
    setTimeLeft(0);
    audio.pause();
  };

  const showTimeLeftTemporarily = () => {
    const minutesLeft = Math.ceil(timeLeft / 60);
    setButtonText(`${minutesLeft} minutes left`);
    setTimeout(() => setButtonText('Show time left'), 5000);
  };

  useEffect(() => {
    let interval;
    if (isRunning && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setIsRunning(false);
            showNotification();
            audio.pause();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, timeLeft]);

  useEffect(() => {
    const handleKeyPress = (e) => {
      if (e.key === ' ' && !e.target.closest('input')) {
        e.preventDefault();
        if (isRunning) {
          handleStop();
        } else {
          handleStart();
        }
      } else if (e.key === '+' && !isRunning) {
        handleTimeChange(1);
      } else if (e.key === '-' && !isRunning) {
        handleTimeChange(-1);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isRunning]);

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        {/* Timer Controls */}
        <div className="flex items-center justify-center space-x-4">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleTimeChange(-1)}
            disabled={isRunning}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <input
            type="number"
            value={minutes}
            onChange={handleTimeInput}
            disabled={isRunning}
            className="w-16 text-center text-2xl font-bold bg-transparent border-none focus:outline-none"
          />
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => handleTimeChange(1)}
            disabled={isRunning}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Preset Times */}
        <div className="flex justify-center gap-2">
          {PRESET_TIMES.map((time) => (
            <Button
              key={time}
              variant="outline"
              onClick={() => setMinutes(time)}
              disabled={isRunning}
              className="px-4"
            >
              {time}
            </Button>
          ))}
        </div>

        {/* Theme Selection */}
        <div className="grid grid-cols-3 gap-3">
          {THEMES.map((theme) => (
            <Button
              key={theme.name}
              variant={selectedTheme === theme.name ? "default" : "outline"}
              onClick={() => setSelectedTheme(theme.name)}
              disabled={isRunning}
              className="theme-btn h-24 flex flex-col items-center justify-center"
            >
              <span className="text-3xl mb-2">{theme.icon}</span>
              <span className="text-sm text-center">{theme.name}</span>
            </Button>
          ))}
        </div>

        {/* Timer Controls */}
        {!isRunning ? (
          <Button 
            className="w-full" 
            size="lg"
            onClick={handleStart}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...
              </>
            ) : (
              <>
                <Play className="mr-2 h-4 w-4" /> Start Focus
              </>
            )}
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="text-center text-xl font-medium">Focus now</div>
            <Button 
              variant="outline" 
              className="w-full"
              onClick={showTimeLeftTemporarily}
            >
                {buttonText}
            </Button>
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleStop}
            >
              <Square className="mr-2 h-4 w-4" /> Stop
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}