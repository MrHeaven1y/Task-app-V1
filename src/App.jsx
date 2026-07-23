import React, { useState, useEffect } from 'react';
import { Moon, Sun, CheckCircle, Circle, Plus, Trash2, Calendar as CalendarIcon, Bell } from 'lucide-react';

function App() {
  const [tasks, setTasks] = useState(() => JSON.parse(localStorage.getItem('tasks')) || []);
  const [dayState, setDayState] = useState(() => localStorage.getItem('dayState') || 'SLEEPING');
  const [newTask, setNewTask] = useState('');
  
  const [wakeHistory, setWakeHistory] = useState(() => JSON.parse(localStorage.getItem('wakeHistory')) || []);
  const [sleepHistory, setSleepHistory] = useState(() => JSON.parse(localStorage.getItem('sleepHistory')) || []);

  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
    localStorage.setItem('dayState', dayState);
    localStorage.setItem('wakeHistory', JSON.stringify(wakeHistory));
    localStorage.setItem('sleepHistory', JSON.stringify(sleepHistory));
  }, [tasks, dayState, wakeHistory, sleepHistory]);

  const addTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;
    setTasks([...tasks, { id: Date.now(), text: newTask, completed: false }]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(t => t.id !== id));
  };

  const handleWakeUp = () => {
    setDayState('AWAKE');
    setWakeHistory([...wakeHistory, new Date().getTime()].slice(-7));
    setTasks(tasks.map(t => ({ ...t, completed: false })));
  };

  const handleSleep = () => {
    setDayState('SLEEPING');
    setSleepHistory([...sleepHistory, new Date().getTime()].slice(-7));
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

  // Convert Date to YYYYMMDDTHHMMSS format for ICS
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
          <h1>TaskFlow</h1>
          <div className="cycle-indicator">
            {dayState === 'AWAKE' ? <Sun className="icon awake-icon" /> : <Moon className="icon sleep-icon" />}
            <span>{dayState === 'AWAKE' ? 'Waking Hours' : 'Resting'}</span>
          </div>
        </header>

        {dayState === 'SLEEPING' ? (
          <div className="sleep-screen">
            <h2>Good Morning?</h2>
            <p>Ready to start your day and tackle your tasks?</p>
            <button className="primary-btn" onClick={handleWakeUp}>
              I'm Awake!
            </button>
            <div className="sync-section">
              <button className="sync-btn" onClick={() => generateICS('WAKE')}>
                <CalendarIcon size={16} /> Sync Next Wake-Up to Calendar
              </button>
            </div>
          </div>
        ) : (
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
                placeholder="What needs to be done?"
                className="task-input"
              />
              <button type="submit" className="add-btn"><Plus size={20} /></button>
            </form>

            <ul className="task-list">
              {tasks.map(task => (
                <li key={task.id} className={`task-item ${task.completed ? 'completed' : ''}`}>
                  <button className="check-btn" onClick={() => toggleTask(task.id)}>
                    {task.completed ? <CheckCircle size={24} className="checked-icon"/> : <Circle size={24} className="unchecked-icon"/>}
                  </button>
                  <span className="task-text">{task.text}</span>
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
              <button className="sync-btn mt-2" onClick={() => generateICS('SLEEP')}>
                <CalendarIcon size={16} /> Sync Next Sleep Time
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
