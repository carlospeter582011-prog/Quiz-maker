import React, { useState } from 'react';
import { GradedQuestion, QuizResult } from '../types';
import { Icons } from './Icons';
import { explainQuestion } from '../services/geminiService';

interface ResultScreenProps {
  result: QuizResult;
  onRestart: () => void;
}

export const ResultScreen: React.FC<ResultScreenProps> = ({ result, onRestart }) => {
  const [activeQuestionId, setActiveQuestionId] = useState<number | null>(null);
  const [chatInput, setChatInput] = useState('');
  const [chatResponse, setChatResponse] = useState<string | null>(null);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const percentage = Math.round((result.totalScore / result.maxScore) * 100);
  
  const getGradeColor = (p: number) => {
    if (p >= 80) return 'text-green-500';
    if (p >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const handleAskAI = async (q: GradedQuestion) => {
    if (!chatInput.trim()) return;
    setIsChatLoading(true);
    setChatResponse(null);
    try {
      const resp = await explainQuestion(q.text, q.userAnswer, q.aiCorrection, chatInput);
      setChatResponse(resp);
    } catch (e) {
      setChatResponse("Sorry, I couldn't connect to the AI tutor right now.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-8 animate-fade-in">
      
      {/* Header Card */}
      <div className="bg-white dark:bg-slate-800 rounded-3xl p-8 shadow-lg border border-gray-100 dark:border-slate-700 flex flex-col md:flex-row items-center md:justify-between gap-6">
        <div className="space-y-2 text-center md:text-left">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">Quiz Completed!</h2>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg">{result.overallFeedback}</p>
        </div>
        <div className="flex flex-col items-center">
          <div className={`text-6xl font-black ${getGradeColor(percentage)}`}>
            {percentage}%
          </div>
          <div className="text-sm font-medium text-gray-400 uppercase tracking-wide mt-1">
            Score: {result.totalScore} / {result.maxScore}
          </div>
        </div>
      </div>

      {/* List of Questions */}
      <div className="space-y-4">
        {result.gradedQuestions.map((q) => (
          <div 
            key={q.id} 
            className={`group bg-white dark:bg-slate-800 rounded-2xl border-l-4 shadow-sm overflow-hidden transition-all
              ${q.isCorrect ? 'border-l-green-500' : 'border-l-red-500'}
            `}
          >
            <div className="p-6 cursor-pointer" onClick={() => setActiveQuestionId(activeQuestionId === q.id ? null : q.id)}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{q.text}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Your Answer:</span>
                    <span className={`font-medium ${q.isCorrect ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400 line-through'}`}>
                      {q.userAnswer || "(No Answer)"}
                    </span>
                  </div>
                </div>
                <div className="mt-1">
                   {q.isCorrect ? <Icons.Check className="w-6 h-6 text-green-500" /> : <Icons.X className="w-6 h-6 text-red-500" />}
                </div>
              </div>
              
              {/* Expand/Collapse Indicator */}
              <div className="mt-4 flex items-center text-xs text-gray-400 font-medium uppercase tracking-wide">
                <span>{activeQuestionId === q.id ? 'Hide Details' : 'Show Details & Explanation'}</span>
                <Icons.Next className={`w-3 h-3 ml-1 transition-transform ${activeQuestionId === q.id ? 'rotate-90' : ''}`} />
              </div>
            </div>

            {/* Expanded Details */}
            {activeQuestionId === q.id && (
              <div className="bg-gray-50 dark:bg-slate-900/50 p-6 border-t border-gray-100 dark:border-slate-700 animate-slide-down">
                
                {!q.isCorrect && (
                   <div className="mb-4">
                      <p className="text-xs font-bold text-gray-500 uppercase mb-1">Correct Answer</p>
                      <p className="text-green-600 dark:text-green-400 font-medium">{q.aiCorrection}</p>
                   </div>
                )}

                <div className="mb-6">
                  <p className="text-xs font-bold text-gray-500 uppercase mb-1">Explanation</p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{q.explanation}</p>
                </div>

                {/* Chat / Ask Logic */}
                <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-gray-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 mb-3 text-blue-600 dark:text-blue-400">
                    <Icons.Chat className="w-4 h-4" />
                    <span className="text-sm font-bold">Ask AI Tutor</span>
                  </div>
                  
                  {chatResponse ? (
                    <div className="space-y-3">
                      <div className="text-sm bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg text-gray-800 dark:text-gray-200">
                        {chatResponse}
                      </div>
                      <button 
                        onClick={() => { setChatResponse(null); setChatInput(''); }}
                        className="text-xs text-blue-500 hover:underline"
                      >
                        Ask another question
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Why is this wrong? Explain more..."
                        className="flex-1 bg-gray-100 dark:bg-slate-900 border-none rounded-lg px-4 text-sm focus:ring-2 focus:ring-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAI(q)}
                      />
                      <button 
                        onClick={() => handleAskAI(q)}
                        disabled={isChatLoading || !chatInput.trim()}
                        className="p-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 hover:bg-blue-700"
                      >
                        {isChatLoading ? <Icons.Spinner className="w-5 h-5 animate-spin" /> : <Icons.Next className="w-5 h-5" />}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <button
          onClick={onRestart}
          className="flex items-center gap-2 px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-full font-bold shadow-lg hover:scale-105 transition-transform"
        >
          <Icons.Retry className="w-4 h-4" />
          <span>Create New Quiz</span>
        </button>
      </div>
    </div>
  );
};
