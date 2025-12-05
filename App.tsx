import React, { useState, useEffect } from 'react';
import { UploadScreen } from './components/UploadScreen';
import { QuizScreen } from './components/QuizScreen';
import { ResultScreen } from './components/ResultScreen';
import { Icons } from './components/Icons';
import { AppState, QuizConfig, Question, UserAnswer, QuizResult } from './types';
import { generateQuiz, gradeQuiz } from './services/geminiService';

const App: React.FC = () => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [appState, setAppState] = useState<AppState>('UPLOAD');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null);
  const [loadingMsg, setLoadingMsg] = useState('');
  const [activeTimeLimit, setActiveTimeLimit] = useState(0);

  // Initialize theme
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setTheme('dark');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const handleStartQuiz = async (config: QuizConfig) => {
    setAppState('GENERATING');
    setLoadingMsg('Analyzing your lesson and crafting questions...');
    setActiveTimeLimit(config.timeLimit);
    try {
      const questions = await generateQuiz(
        config.documents, 
        config.numQuestions, 
        config.selectedTypes, 
        config.autoDetect,
        config.difficulty,
        config.customInstructions
      );
      setQuizQuestions(questions);
      setAppState('QUIZ');
    } catch (error) {
      console.error(error);
      alert('Failed to generate quiz. Please ensure your files are readable and try again.');
      setAppState('UPLOAD');
    }
  };

  const handleSubmitQuiz = async (answers: UserAnswer[]) => {
    setAppState('GRADING');
    setLoadingMsg('Grading your answers and generating feedback...');
    try {
      const result = await gradeQuiz(quizQuestions, answers);
      setQuizResult(result);
      setAppState('RESULTS');
    } catch (error) {
      console.error(error);
      alert('Failed to grade quiz. Please try again.');
      setAppState('QUIZ'); 
    }
  };

  const handleRestart = () => {
    setAppState('UPLOAD');
    setQuizQuestions([]);
    setQuizResult(null);
    setActiveTimeLimit(0);
  };

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-blue-100 selection:text-blue-900 dark:selection:bg-blue-900 dark:selection:text-blue-100">
      
      {/* Navbar */}
      <nav className="w-full px-6 py-4 flex justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 border-b border-gray-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-500 p-2 rounded-lg text-white">
            <Icons.AI className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight hidden sm:block">QuizGenius</span>
        </div>
        <button 
          onClick={toggleTheme}
          className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-gray-600 dark:text-gray-400"
        >
          {theme === 'light' ? <Icons.Moon className="w-5 h-5" /> : <Icons.Sun className="w-5 h-5" />}
        </button>
      </nav>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Background blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 opacity-40 dark:opacity-20 pointer-events-none">
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
          <div className="absolute top-40 -right-20 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
          <div className="absolute -bottom-20 left-40 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
        </div>

        <div className="container mx-auto px-4 py-8 flex-1 flex flex-col justify-center">
          
          {appState === 'UPLOAD' && (
            <UploadScreen onStartQuiz={handleStartQuiz} />
          )}

          {(appState === 'GENERATING' || appState === 'GRADING') && (
            <div className="flex flex-col items-center justify-center space-y-6 animate-pulse">
              <div className="relative">
                 <div className="w-20 h-20 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Icons.AI className="w-8 h-8 text-blue-600" />
                 </div>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 text-center max-w-md">
                {loadingMsg}
              </h2>
              <p className="text-gray-500">This usually takes about 10-20 seconds.</p>
            </div>
          )}

          {appState === 'QUIZ' && (
            <QuizScreen 
              questions={quizQuestions} 
              onSubmit={handleSubmitQuiz} 
              timeLimit={activeTimeLimit} 
            />
          )}

          {appState === 'RESULTS' && quizResult && (
            <ResultScreen result={quizResult} onRestart={handleRestart} />
          )}

        </div>
      </main>

      <footer className="py-6 text-center text-sm text-gray-400 dark:text-gray-600">
        <p>© 2024 QuizGenius AI. Powered by Gemini.</p>
      </footer>

      {/* Tailwind Custom Animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
        .animate-fade-in {
          animation: fadeIn 0.5s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-in {
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </div>
  );
};

export default App;