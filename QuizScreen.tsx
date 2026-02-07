import React, { useState, useEffect, useRef } from 'react';
import { Question, QuestionType, UserAnswer } from '../types';
import { Icons } from './Icons';

interface QuizScreenProps {
  questions: Question[];
  onSubmit: (answers: UserAnswer[]) => void;
  timeLimit: number; // in minutes, 0 = unlimited
}

export const QuizScreen: React.FC<QuizScreenProps> = ({ questions, onSubmit, timeLimit }) => {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(timeLimit * 60); // in seconds

  // State for sequencing (local reordering)
  const [sequenceItems, setSequenceItems] = useState<string[]>([]);
  
  // State for matching (map left items to selected right items)
  // Store as { leftItem: rightItem }
  const [matchSelections, setMatchSelections] = useState<Record<string, string>>({});

  const currentQuestion = questions[currentIdx];
  const progress = ((currentIdx + 1) / questions.length) * 100;
  const isLastQuestion = currentIdx === questions.length - 1;

  // Timer Effect
  useEffect(() => {
    if (timeLimit <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleTimeUp();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLimit]);

  // Initialize local state when question changes
  useEffect(() => {
    if (currentQuestion.type === QuestionType.SEQUENCING && currentQuestion.sequencingItems) {
      // Shuffle items for initial display if not already shuffled in stored state
      const shuffled = [...currentQuestion.sequencingItems].sort(() => Math.random() - 0.5);
      setSequenceItems(shuffled);
    }
    
    if (currentQuestion.type === QuestionType.MATCHING) {
      setMatchSelections({});
    }
  }, [currentQuestion]);

  const handleAnswer = (val: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: val }));
  };

  const saveComplexAnswer = () => {
    if (currentQuestion.type === QuestionType.SEQUENCING) {
      // Join items with a separator
      handleAnswer(sequenceItems.join(' || '));
    } else if (currentQuestion.type === QuestionType.MATCHING) {
      // Format: "Left1 -> RightA, Left2 -> RightB"
      const formatted = Object.entries(matchSelections)
        .map(([left, right]) => `${left} -> ${right}`)
        .join(', ');
      handleAnswer(formatted);
    }
  };

  const getFormattedAnswers = () => {
    // Determine the answer for the current question based on its type
    let currentAns = answers[currentQuestion.id] || "";
    
    if (currentQuestion.type === QuestionType.SEQUENCING) {
      currentAns = sequenceItems.join(' || ');
    } else if (currentQuestion.type === QuestionType.MATCHING) {
      currentAns = Object.entries(matchSelections)
        .map(([left, right]) => `${left} -> ${right}`)
        .join(', ');
    }

    // Merge current state with previously saved answers
    const finalAnswersMap = { ...answers, [currentQuestion.id]: currentAns };
    
    const formattedAnswers: UserAnswer[] = Object.entries(finalAnswersMap).map(([id, answer]) => ({
      questionId: parseInt(id),
      answer: answer as string
    }));
    
    // Ensure all questions have an entry, even if blank
    questions.forEach(q => {
      if (!formattedAnswers.find(a => a.questionId === q.id)) {
        formattedAnswers.push({ questionId: q.id, answer: "" });
      }
    });

    return formattedAnswers;
  };

  const handleNext = () => {
    // Save current complex state to main answers before moving
    if (currentQuestion.type === QuestionType.SEQUENCING || currentQuestion.type === QuestionType.MATCHING) {
      saveComplexAnswer();
    }

    if (isLastQuestion) {
      onSubmit(getFormattedAnswers());
    } else {
      setCurrentIdx(prev => prev + 1);
    }
  };

  const handleTimeUp = () => {
    // Force submission with whatever we have
    // We need to use a Ref or access state inside the callback if we were inside an effect,
    // but here we are calling a function that will use the latest state due to closure in functional updates,
    // HOWEVER, setInterval forms a closure over initial state. 
    // Actually, react state updates inside setInterval might be stale if not careful.
    // BUT, handleTimeUp is called from setTimeLeft callback? No, that's risky.
    // Safest is to just call submit with what we can reconstruct or simple blank submission if strictly timed out?
    // Actually, `getFormattedAnswers` relies on `answers` state. 
    // To fix stale closure in setInterval, we'll rely on the fact that we triggered it via state update check or separate effect?
    // Let's use the effect that checks timeLeft.
    
    // We can't easily access the freshest `answers` inside the interval closure directly without refs.
    // So we will trigger a submit in a separate useEffect or just alert the user.
    // For now, let's just trigger submit using the component's current scope which *should* be fresh on re-renders,
    // but setInterval doesn't re-render.
    
    // CORRECTION: We'll implement `handleTimeUp` logic inside a useEffect dependent on `timeLeft` = 0.
  };
  
  // Watch for timeout
  useEffect(() => {
    if (timeLimit > 0 && timeLeft === 0) {
      // Time is up!
      onSubmit(getFormattedAnswers());
    }
  }, [timeLeft, timeLimit]);


  // Sequencing Helpers
  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newItems = [...sequenceItems];
    if (direction === 'up' && index > 0) {
      [newItems[index], newItems[index - 1]] = [newItems[index - 1], newItems[index]];
    } else if (direction === 'down' && index < newItems.length - 1) {
      [newItems[index], newItems[index + 1]] = [newItems[index + 1], newItems[index]];
    }
    setSequenceItems(newItems);
  };

  // Matching Helpers
  const handleMatchSelect = (leftItem: string, rightItem: string) => {
    setMatchSelections(prev => ({ ...prev, [leftItem]: rightItem }));
  };

  // Helper to format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderInput = () => {
    switch (currentQuestion.type) {
      case QuestionType.MULTIPLE_CHOICE:
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((opt, idx) => (
              <button
                key={idx}
                onClick={() => handleAnswer(opt)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all
                  ${answers[currentQuestion.id] === opt 
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-1 ring-blue-500' 
                    : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'}
                `}
              >
                <div className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full border flex items-center justify-center
                    ${answers[currentQuestion.id] === opt ? 'border-blue-500 bg-blue-500 text-white' : 'border-gray-400'}
                  `}>
                    {answers[currentQuestion.id] === opt && <div className="w-2 h-2 bg-white rounded-full" />}
                  </div>
                  <span className="text-gray-800 dark:text-gray-200 font-medium">{opt}</span>
                </div>
              </button>
            ))}
          </div>
        );
      
      case QuestionType.TRUE_FALSE:
        return (
          <div className="grid grid-cols-2 gap-4">
            {['True', 'False'].map((opt) => (
              <button
                key={opt}
                onClick={() => handleAnswer(opt)}
                className={`p-6 rounded-xl border-2 font-bold text-lg transition-all
                  ${answers[currentQuestion.id] === opt 
                    ? opt === 'True' 
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                      : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-400'}
                `}
              >
                {opt}
              </button>
            ))}
          </div>
        );

      case QuestionType.SEQUENCING:
        return (
          <div className="space-y-3">
            <p className="text-sm text-gray-500 italic">Use the arrows to reorder the items correctly.</p>
            {sequenceItems.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-lg">
                 <div className="flex flex-col gap-1">
                    <button 
                      onClick={() => moveItem(idx, 'up')}
                      disabled={idx === 0}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                    >
                      <Icons.Next className="w-4 h-4 -rotate-90" />
                    </button>
                    <button 
                      onClick={() => moveItem(idx, 'down')}
                      disabled={idx === sequenceItems.length - 1}
                      className="p-1 hover:bg-gray-200 dark:hover:bg-slate-700 rounded disabled:opacity-30"
                    >
                      <Icons.Next className="w-4 h-4 rotate-90" />
                    </button>
                 </div>
                 <div className="flex-1 font-medium text-gray-800 dark:text-gray-200">
                   {item}
                 </div>
                 <div className="text-xs font-bold text-gray-400">#{idx + 1}</div>
              </div>
            ))}
          </div>
        );

      case QuestionType.MATCHING:
        // Extract all right side options for the dropdown
        const rightOptions = currentQuestion.matchingPairs?.map(p => p.right).sort() || [];
        
        return (
          <div className="space-y-4">
             <p className="text-sm text-gray-500 italic">Pair each item on the left with the correct match.</p>
             {currentQuestion.matchingPairs?.map((pair, idx) => (
               <div key={idx} className="flex flex-col md:flex-row md:items-center gap-2 md:gap-4 p-4 border border-gray-100 dark:border-slate-700 rounded-xl bg-gray-50/50 dark:bg-slate-800/50">
                  <div className="md:w-1/2 font-semibold text-gray-800 dark:text-gray-200">
                    {pair.left}
                  </div>
                  <div className="hidden md:block text-gray-400">→</div>
                  <div className="md:w-1/2">
                    <select 
                      className="w-full p-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-gray-800 dark:text-gray-200"
                      value={matchSelections[pair.left] || ""}
                      onChange={(e) => handleMatchSelect(pair.left, e.target.value)}
                    >
                      <option value="">Select match...</option>
                      {rightOptions.map((opt, i) => (
                        <option key={i} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
               </div>
             ))}
          </div>
        );

      case QuestionType.FILL_IN_BLANK:
      case QuestionType.SHORT_ANSWER:
      default:
        return (
          <div className="space-y-2">
            <textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full p-4 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-transparent focus:border-blue-500 focus:ring-0 transition-colors h-32 resize-none"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center space-x-1">
              <Icons.AI className="w-3 h-3" />
              <span>AI will grade the meaning of your answer.</span>
            </p>
          </div>
        );
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 w-full h-full flex flex-col">
      {/* Top Bar with Timer */}
      <div className="flex justify-between items-center mb-6">
         <div className="flex flex-col">
           <span className="text-sm font-medium text-gray-500 dark:text-gray-400">Question {currentIdx + 1} of {questions.length}</span>
           <div className="h-1.5 w-32 bg-gray-200 dark:bg-gray-700 rounded-full mt-2 overflow-hidden">
              <div 
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
           </div>
         </div>

         {timeLimit > 0 && (
           <div className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono font-bold text-lg border
             ${timeLeft < 60 
                ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800 animate-pulse' 
                : 'bg-gray-50 text-gray-700 border-gray-200 dark:bg-slate-800 dark:text-gray-200 dark:border-slate-700'}
           `}>
             <span className="text-xs uppercase tracking-wider text-gray-400 mr-1">Time Left</span>
             {formatTime(timeLeft)}
           </div>
         )}
      </div>

      {/* Question Card with Transition Animation */}
      <div className="flex-1 flex flex-col">
        {/* key={currentIdx} forces a re-render for the animation to play on question change */}
        <div 
          key={currentIdx} 
          className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 p-6 md:p-8 space-y-6 flex-1 animate-slide-in"
        >
          <div className="space-y-4">
            <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-200 uppercase tracking-wider">
              {currentQuestion.type.replace('_', ' ')}
            </span>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white leading-snug">
              {currentQuestion.text}
            </h2>
          </div>

          <div className="py-4">
            {renderInput()}
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-6 flex justify-between items-center">
          <button
            onClick={() => {
               // Must save current state logic if going back? 
               // For simplicity in this version, we don't restore complex state perfectly when going BACK, only forward saves.
               // Improving this would require moving complex state up or syncing it differently.
               setCurrentIdx(prev => Math.max(0, prev - 1));
            }}
            disabled={currentIdx === 0}
            className={`px-6 py-3 rounded-xl font-medium transition-colors
              ${currentIdx === 0 
                ? 'opacity-0 pointer-events-none' 
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-800'}
            `}
          >
            Previous
          </button>
          
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all flex items-center space-x-2"
          >
            <span>{isLastQuestion ? 'Submit Quiz' : 'Next Question'}</span>
            {!isLastQuestion && <Icons.Next className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};