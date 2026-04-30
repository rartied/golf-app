import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { calcHandicapIndex } from '../utils/handicap';

// DB uses snake_case columns; app uses camelCase objects
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
  };
}

export function useAppData() {
  const [rounds, setRounds] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const [{ data: roundsData, error: re }, { data: coursesData, error: ce }] = await Promise.all([
          supabase.from('rounds').select('*').order('date', { ascending: false }),
          supabase.from('courses').select('*').order('created_at', { ascending: false }),
        ]);
        if (re) throw re;
        if (ce) throw ce;
        setRounds((roundsData ?? []).map(rowToRound));
        setCourses(coursesData ?? []);
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
    const { data, error } = await supabase.from('rounds').insert([roundToRow(round)]).select().single();
    if (error) {
      setRounds(prev => prev.filter(r => r.id !== round.id)); // rollback
      console.error('Failed to save round', error);
    } else {
      setRounds(prev => prev.map(r => r.id === round.id ? rowToRound(data) : r));
    }
  }, []);

  const updateRound = useCallback(async (round) => {
    setRounds(prev => prev.map(r => r.id === round.id ? round : r)); // optimistic
    const { error } = await supabase.from('rounds').update(roundToRow(round)).eq('id', round.id);
    if (error) console.error('Failed to update round', error);
  }, []);

  const deleteRound = useCallback(async (id) => {
    setRounds(prev => prev.filter(r => r.id !== id)); // optimistic
    const { error } = await supabase.from('rounds').delete().eq('id', id);
    if (error) console.error('Failed to delete round', error);
  }, []);

  const addCourse = useCallback(async (course) => {
    setCourses(prev => [course, ...prev]); // optimistic
    const { data, error } = await supabase.from('courses').insert([course]).select().single();
    if (error) {
      setCourses(prev => prev.filter(c => c.id !== course.id)); // rollback
      console.error('Failed to save course', error);
    } else {
      setCourses(prev => prev.map(c => c.id === course.id ? data : c));
    }
  }, []);

  const updateCourse = useCallback(async (course) => {
    setCourses(prev => prev.map(c => c.id === course.id ? course : c)); // optimistic
    const { error } = await supabase.from('courses').update(course).eq('id', course.id);
    if (error) console.error('Failed to update course', error);
  }, []);

  const deleteCourse = useCallback(async (id) => {
    setCourses(prev => prev.filter(c => c.id !== id)); // optimistic
    const { error } = await supabase.from('courses').delete().eq('id', id);
    if (error) console.error('Failed to delete course', error);
  }, []);

  const handicapIndex = calcHandicapIndex(rounds);

  return {
    rounds,
    courses,
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
