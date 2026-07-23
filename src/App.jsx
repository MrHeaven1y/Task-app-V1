import React, { useState, useEffect } from 'react';
import { Moon, Sun, CheckCircle, Circle, Plus, Trash2, Calendar as CalendarIcon, Settings, X, Zap, Shield, Flame } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('tasks')) || []);
  const [dayState, setDayState] = useState(() => localStorage.getItem('dayState') || 'SLEEPING'); // SLEEPING | AWAKE_PROMPT | AWAKE
  const [dayType, setDayType] = useState(() => localStorage.getItem('dayType') || '');
  const [newTask, setNewTask] = useState('');
  
  // Settings & EMA
  const [useEma, setUseEma] = useState(() => JSON.parse(localStorage.getItem('useEma')) ?? true);
  const [showSettings, setShowSettings] = useState(false);
  const [wakeHistory, setWakeHistory] = useState(() => JSON.parse(localStorage.getItem('wakeHistory')) || []);
  const [sleepHistory, setSleepHistory] = useState(() => JSON.parse(localStorage.getItem('sleepHistory')) || []);
  
  // Recurring Chores
  const [lastGmailCheck, setLastGmailCheck] = useState(() => localStorage.getItem('lastGmailCheck') || '');

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('dayState', dayState);
    localStorage.setItem('dayType', dayType);
    localStorage.setItem('useEma', JSON.stringify(useEma));
    localStorage.setItem('wakeHistory', JSON.stringify(wakeHistory));
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
    localStorage.setItem('lastGmailCheck', lastGmailCheck);
  }, [tasks, dayState, dayType, useEma, wakeHistory, sleepHistory, lastGmailCheck]);

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now().toString(), text: newTask, completed: false, type: 'custom' }]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => {
      if (t.id === id) {
        if (!t.completed && id === 'gmail_checker') {
          setLastGmailCheck(Date.now().toString());
        }
        return { ...t, completed: !t.completed };
      }
      return t;
    }));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleWakeUpClick = () => {
    setDayState('AWAKE_PROMPT');
    if (useEma) {
      setWakeHistory([...wakeHistory, new Date().getTime()].slice(-7));
    }
  };

  const startDay = (type, apps) => {
    setDayState('AWAKE');
    setDayType(type);
    
    const newTasks = [
      { id: Date.now() + '1', text: `Job Applications (${apps} apps)`, completed: false, type: 'core' },
      { id: Date.now() + '2', text: `Networking (20 min)`, completed: false, type: 'core' },
      { id: Date.now() + '3', text: `Placement Prep (50 min)`, completed: false, type: 'core' },
      { id: Date.now() + '4', text: `Personal Brand (45 min)`, completed: false, type: 'core' },
    ];

    const now = new Date();
    // 3 Days = 3 * 24 * 60 * 60 * 1000 = 259200000 ms
    if (!lastGmailCheck || (now.getTime() - parseInt(lastGmailCheck)) >= 259200000) {
      const lastDate = lastGmailCheck ? new Date(parseInt(lastGmailCheck)).toLocaleDateString() : 'Never';
      const todayDate = now.toLocaleDateString();
      newTasks.push({ id: 'gmail_checker', text: `Run Gmail Checker (Last: ${lastDate} | Check: ${todayDate})`, completed: false, type: 'chore' });
    }

    const dayOfWeek = now.getDay(); // 0 is Sunday, 6 is Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      newTasks.push({ id: 'weekend_dashboard', text: `Checkup Dashboard Updates (Weekend Routine)`, completed: false, type: 'chore' });
    }

    // Keep unfinished custom tasks, discard old core/chore tasks
    const existingCustomTasks = tasks.filter(t => t.type === 'custom' && !t.completed);
    setTasks([...newTasks, ...existingCustomTasks]);
  };

  const handleSleep = () => {
    setDayState('SLEEPING');
    setDayType('');
    if (useEma) {
      setSleepHistory([...sleepHistory, new Date().getTime()].slice(-7));
    }
  };

  const getAverageTime = (historyArray, defaultHour, shiftHours = 0) => {
    if (historyArray.length === 0) {
      const d = new Date();
      d.setHours(defaultHour, 0, 0, 0);
      if (d < new Date()) d.setDate(d.getDate() + 1);
      return d;
    }
    let totalMinutes = 0;
    historyArray.forEach(ts => {
      const d = new Date(ts);
      let h = d.getHours() - shiftHours;
      if (h < 0) h += 24;
      totalMinutes += h * 60 + d.getMinutes();
    });
    const avgMinutes = Math.floor(totalMinutes / historyArray.length);
    let h = Math.floor(avgMinutes / 60) + shiftHours;
    if (h >= 24) h -= 24;
    
    const target = new Date();
    target.setHours(h, avgMinutes % 60, 0, 0);
    if (target < new Date()) target.setDate(target.getDate() + 1);
    return target;
  };

  const formatDateForICS = (date) => {
    const pad = (n) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}T${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
  };

  const generateICS = (type) => {
    const targetTime = type === 'WAKE' 
      ? getAverageTime(wakeHistory, 6, 0)
      : getAverageTime(sleepHistory, 23, 12);

    const start = formatDateForICS(targetTime);
    const endObj = new Date(targetTime.getTime() + 15 * 60000);
    const end = formatDateForICS(endObj);

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${start}
DTEND:${end}
SUMMARY:TaskFlow: ${type === 'WAKE' ? 'Time to Wake Up & Start Day!' : 'Time to Sleep & End Day!'}
DESCRIPTION:Open the TaskFlow app to log your cycle.
BEGIN:VALARM
ACTION:DISPLAY
DESCRIPTION:Reminder
TRIGGER:-PT0M
END:VALARM
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `TaskFlow_${type}_Reminder.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const streak = tasks.filter(t => t.completed).length;
  const total = tasks.length;
  const progress = total === 0 ? 0 : (streak / total) * 100;

  return (
    <div className="app-container">
      <div className="glass-panel">
        <header className="header">
          <div className="title-group">
            <h1>TaskFlow</h1>
            {dayType && <span className={`day-badge badge-${dayType.split(' ')[0].toLowerCase()}`}>{dayType} Day</span>}
          </div>
          <div className="header-actions">
            <div className="cycle-indicator">
              {dayState === 'AWAKE' || dayState === 'AWAKE_PROMPT' ? <Sun className="icon awake-icon" /> : <Moon className="icon sleep-icon" />}
            </div>
            <button className="settings-btn" onClick={() => setShowSettings(true)}>
              <Settings size={20} />
            </button>
          </div>
        </header>

        {showSettings && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h3>Settings</h3>
                <button className="close-btn" onClick={() => setShowSettings(false)}><X size={20}/></button>
              </div>
              <div className="setting-item">
                <div className="setting-text">
                  <h4>Adaptive Notifications (EMA)</h4>
                  <p>Record wake/sleep times to generate predictive calendar syncs.</p>
                </div>
                <label className="toggle-switch">
                  <input type="checkbox" checked={useEma} onChange={(e) => setUseEma(e.target.checked)} />
                  <span className="slider"></span>
                </label>
              </div>
            </div>
          </div>
        )}

        {dayState === 'SLEEPING' && (
          <div className="sleep-screen">
            <h2>Good Morning?</h2>
            <p>Ready to conquer your goals today?</p>
            <button className="primary-btn" onClick={handleWakeUpClick}>
              I'm Awake!
            </button>
            {useEma && (
              <div className="sync-section">
                <button className="sync-btn" onClick={() => generateICS('WAKE')}>
                  <CalendarIcon size={16} /> Sync Next Wake-Up to Calendar
                </button>
              </div>
            )}
          </div>
        )}

        {dayState === 'AWAKE_PROMPT' && (
          <div className="prompt-screen">
            <h2>Select Day Type</h2>
            <p>How aggressive is our job hunt today?</p>
            <div className="day-type-buttons">
              <button className="type-btn super-agg" onClick={() => startDay('Super Aggressive', 50)}>
                <Flame size={20} /> Super Aggressive (50 Apps)
              </button>
              <button className="type-btn agg" onClick={() => startDay('Aggressive', 25)}>
                <Zap size={20} /> Aggressive (25 Apps)
              </button>
              <button className="type-btn passive" onClick={() => startDay('Passive', '5-10')}>
                <Shield size={20} /> Passive (5-10 Apps)
              </button>
            </div>
          </div>
        )}

        {dayState === 'AWAKE' && (
          <div className="awake-screen">
            <div className="stats-board">
              <div className="progress-bar">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <p>{streak} of {total} tasks completed today</p>
            </div>

            <form onSubmit={addTask} className="task-form">
              <input 
                type="text" 
                value={newTask}
                onChange={(e) => setNewTask(e.target.value)}
                placeholder="Add a custom task..."
                className="task-input"
              />
              <button type="submit" className="add-btn"><Plus size={20} /></button>
            </form>

            <ul className="task-list">
              {tasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''} ${task.type}`}>
                  <button className="check-btn" onClick={() => toggleTask(task.id)}>
                    {task.completed ? <CheckCircle size={24} className="checked-icon"/> : <Circle size={24} className="unchecked-icon"/>}
                  </button>
                  <div className="task-content">
                    <span className="task-text">{task.text}</span>
                    {task.type === 'chore' && <span className="chore-badge">Priority Chore</span>}
                  </div>
                  <button className="delete-btn" onClick={() => deleteTask(task.id)}>
                    <Trash2 size={20} />
                  </button>
                </li>
              ))}
            </ul>

            <div className="end-day-section">
              <button className="secondary-btn" onClick={handleSleep}>
                <Moon size={18} /> Going to Sleep
              </button>
              {useEma && (
                <button className="sync-btn mt-2" onClick={() => generateICS('SLEEP')}>
                  <CalendarIcon size={16} /> Sync Next Sleep Time
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
