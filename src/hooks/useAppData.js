import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';
import { calcHandicapIndex } from '../utils/handicap';

// API uses snake_case columns; app uses camelCase objects
function rowToRound(row) {
  return {
    id: row.id,
    date: row.date,
    courseId: row.course_id,
    courseName: row.course_name,
    teeId: row.tee_id,
    teeName: row.tee_name,
    courseRating: row.course_rating,
    slope: row.slope,
    coursePar: row.course_par,
    totalScore: row.total_score,
    adjustedGrossScore: row.adjusted_gross_score,
    scoreDifferential: row.score_differential,
    holeScores: row.hole_scores ?? [],
    holesPlayed: row.holes_played ?? 18,
    nineHoleType: row.nine_hole_type ?? null,
  };
}

function roundToRow(round) {
  return {
    id: round.id,
    date: round.date,
    course_id: round.courseId,
    course_name: round.courseName,
    tee_id: round.teeId,
    tee_name: round.teeName,
    course_rating: round.courseRating,
    slope: round.slope,
    course_par: round.coursePar,
    total_score: round.totalScore,
    adjusted_gross_score: round.adjustedGrossScore,
    score_differential: round.scoreDifferential,
    hole_scores: round.holeScores ?? [],
    holes_played: round.holesPlayed ?? 18,
    nine_hole_type: round.nineHoleType ?? null,
  };
}

export function useAppData() {
  const [rounds, setRounds] = useState([]);
  const [courses, setCourses] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [roundsData, coursesData, usersData] = await Promise.all([
          api.get('/rounds'),
          api.get('/courses'),
          api.get('/users').catch(() => []), // roster is non-critical; don't block load
        ]);
        setRounds((roundsData ?? []).map(rowToRound));
        setCourses(coursesData ?? []);
        setUsers(usersData ?? []);
      } catch (err) {
        setError(err.message ?? 'Failed to load data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const addRound = useCallback(async (round) => {
    setRounds(prev => [round, ...prev]); // optimistic
    try {
      const saved = await api.post('/rounds', roundToRow(round));
      setRounds(prev => prev.map(r => r.id === round.id ? rowToRound(saved) : r));
    } catch (err) {
      setRounds(prev => prev.filter(r => r.id !== round.id)); // rollback
      console.error('Failed to save round', err);
    }
  }, []);

  const updateRound = useCallback(async (round) => {
    setRounds(prev => prev.map(r => r.id === round.id ? round : r)); // optimistic
    try {
      await api.put(`/rounds/${round.id}`, roundToRow(round));
    } catch (err) {
      console.error('Failed to update round', err);
    }
  }, []);

  const deleteRound = useCallback(async (id) => {
    setRounds(prev => prev.filter(r => r.id !== id)); // optimistic
    try {
      await api.del(`/rounds/${id}`);
    } catch (err) {
      console.error('Failed to delete round', err);
    }
  }, []);

  const addCourse = useCallback(async (course) => {
    setCourses(prev => [course, ...prev]); // optimistic
    try {
      const saved = await api.post('/courses', course);
      setCourses(prev => prev.map(c => c.id === course.id ? saved : c));
    } catch (err) {
      setCourses(prev => prev.filter(c => c.id !== course.id)); // rollback
      console.error('Failed to save course', err);
    }
  }, []);

  const updateCourse = useCallback(async (course) => {
    setCourses(prev => prev.map(c => c.id === course.id ? course : c)); // optimistic
    try {
      await api.put(`/courses/${course.id}`, course);
    } catch (err) {
      console.error('Failed to update course', err);
    }
  }, []);

  const deleteCourse = useCallback(async (id) => {
    setCourses(prev => prev.filter(c => c.id !== id)); // optimistic
    try {
      await api.del(`/courses/${id}`);
    } catch (err) {
      console.error('Failed to delete course', err);
    }
  }, []);

  const handicapIndex = calcHandicapIndex(rounds);

  return {
    rounds,
    courses,
    users,
    handicapIndex,
    loading,
    error,
    addRound,
    updateRound,
    deleteRound,
    addCourse,
    updateCourse,
    deleteCourse,
  };
}
