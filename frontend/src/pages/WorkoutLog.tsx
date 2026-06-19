import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { createWorkout } from '../api/workouts';
import type { WorkoutCreatePayload } from '../types';

interface SetInput { reps: string; weight_kg: string }
interface ExerciseInput { name: string; sets: SetInput[] }

const emptySet = (): SetInput => ({ reps: '', weight_kg: '' });
const emptyExercise = (): ExerciseInput => ({ name: '', sets: [emptySet()] });

export default function WorkoutLog() {
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState<ExerciseInput[]>([emptyExercise()]);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  function addExercise() {
    setExercises((prev) => [...prev, emptyExercise()]);
  }

  function addSet(exIdx: number) {
    setExercises((prev) =>
      prev.map((ex, i) => i === exIdx ? { ...ex, sets: [...ex.sets, emptySet()] } : ex)
    );
  }

  function updateExerciseName(exIdx: number, name: string) {
    setExercises((prev) => prev.map((ex, i) => i === exIdx ? { ...ex, name } : ex));
  }

  function updateSet(exIdx: number, setIdx: number, field: keyof SetInput, value: string) {
    setExercises((prev) =>
      prev.map((ex, i) =>
        i === exIdx
          ? { ...ex, sets: ex.sets.map((s, j) => j === setIdx ? { ...s, [field]: value } : s) }
          : ex
      )
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    const payload: WorkoutCreatePayload = {
      title,
      notes: notes || undefined,
      exercises: exercises.map((ex, exIdx) => ({
        name: ex.name,
        order_index: exIdx,
        sets: ex.sets.map((s, sIdx) => ({
          set_number: sIdx + 1,
          reps: s.reps ? parseInt(s.reps) : undefined,
          weight_kg: s.weight_kg ? parseFloat(s.weight_kg) : undefined,
        })),
      })),
    };
    try {
      await createWorkout(payload);
      navigate('/');
    } catch {
      setError('Failed to save workout.');
    }
  }

  return (
    <div>
      <h1>Log Workout</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input placeholder="Workout title" value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />

        {exercises.map((ex, exIdx) => (
          <div key={exIdx} style={{ border: '1px solid #ccc', padding: 8, margin: '8px 0' }}>
            <input
              placeholder={`Exercise ${exIdx + 1} name`}
              value={ex.name}
              onChange={(e) => updateExerciseName(exIdx, e.target.value)}
              required
            />
            <table>
              <thead>
                <tr><th>Set</th><th>Reps</th><th>Weight (kg)</th></tr>
              </thead>
              <tbody>
                {ex.sets.map((s, sIdx) => (
                  <tr key={sIdx}>
                    <td>{sIdx + 1}</td>
                    <td><input type="number" min={0} value={s.reps} onChange={(e) => updateSet(exIdx, sIdx, 'reps', e.target.value)} /></td>
                    <td><input type="number" min={0} step="0.5" value={s.weight_kg} onChange={(e) => updateSet(exIdx, sIdx, 'weight_kg', e.target.value)} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="button" onClick={() => addSet(exIdx)}>+ Set</button>
          </div>
        ))}

        <button type="button" onClick={addExercise}>+ Exercise</button>
        <br />
        <button type="submit">Save Workout</button>
      </form>
    </div>
  );
}
