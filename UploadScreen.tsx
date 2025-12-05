import React, { useCallback, useState } from 'react';
import { Icons } from './Icons';
import { QuizConfig, QuestionType, UploadedFile } from '../types';

interface UploadScreenProps {
  onStartQuiz: (config: QuizConfig) => void;
}

const QUESTION_TYPES = [
  { id: QuestionType.MULTIPLE_CHOICE, label: 'Multiple Choice' },
  { id: QuestionType.TRUE_FALSE, label: 'True / False' },
  { id: QuestionType.FILL_IN_BLANK, label: 'Fill in Blank' },
  { id: QuestionType.SHORT_ANSWER, label: 'Rewrite / Short' },
  { id: QuestionType.MATCHING, label: 'Matching' },
  { id: QuestionType.SEQUENCING, label: 'Sequencing' },
];

export const UploadScreen: React.FC<UploadScreenProps> = ({ onStartQuiz }) => {
  const [documents, setDocuments] = useState<UploadedFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [numQuestions, setNumQuestions] = useState(5);
  const [selectedTypes, setSelectedTypes] = useState<QuestionType[]>([]);
  const [autoDetect, setAutoDetect] = useState(true);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [customInstructions, setCustomInstructions] = useState('');
  const [timeLimit, setTimeLimit] = useState(0); // 0 = unlimited
  const [error, setError] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = async (files: File[]) => {
    setIsProcessing(true);
    setError('');
    
    const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    const newDocs: UploadedFile[] = [];

    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        setError(`Skipped invalid file: ${file.name}. Only PDF/Images allowed.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError(`Skipped large file: ${file.name}. Max 10MB.`);
        continue;
      }

      try {
        const base64 = await readFileAsBase64(file);
        newDocs.push({
          id: Math.random().toString(36).substr(2, 9),
          name: file.name,
          mimeType: file.type,
          base64: base64
        });
      } catch (e) {
        console.error("File read error", e);
        setError("Error reading file.");
      }
    }

    setDocuments(prev => [...prev, ...newDocs]);
    setIsProcessing(false);
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const removeDoc = (id: string) => {
    setDocuments(prev => prev.filter(d => d.id !== id));
  };

  const toggleType = (type: QuestionType) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(prev => prev.filter(t => t !== type));
    } else {
      setSelectedTypes(prev => [...prev, type]);
    }
    setAutoDetect(false);
  };

  const handleSubmit = () => {
    if (documents.length === 0) {
      setError('Please upload at least one lesson file.');
      return;
    }
    if (!autoDetect && selectedTypes.length === 0) {
      setError('Please select at least one question type or enable Auto-detect.');
      return;
    }
    
    onStartQuiz({
      documents,
      numQuestions,
      selectedTypes,
      autoDetect,
      difficulty,
      customInstructions: customInstructions.trim(),
      timeLimit
    });
  };

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-8 animate-fade-in">
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          QuizGenius AI
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Upload your lesson notes, PDFs, or images. Let AI create the perfect practice test.
        </p>
      </div>

      {/* Upload Area */}
      <div 
        className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-300 flex flex-col items-center justify-center text-center
          ${dragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-gray-300 dark:border-gray-700 hover:border-blue-400 dark:hover:border-blue-500'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input 
          type="file" 
          multiple
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          onChange={handleFileChange}
          accept=".pdf, .jpg, .jpeg, .png, .webp"
        />
        
        <div className="space-y-3 pointer-events-none">
          <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            {isProcessing ? <Icons.Spinner className="w-8 h-8 animate-spin" /> : <Icons.Upload className="w-8 h-8" />}
          </div>
          <div>
            <p className="font-semibold text-gray-900 dark:text-white">Click to upload or drag & drop</p>
            <p className="text-sm text-gray-500">PDF, JPG, PNG (Max 10MB per file)</p>
          </div>
        </div>
      </div>

      {/* File List */}
      {documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div key={doc.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg shadow-sm">
              <div className="flex items-center space-x-3 overflow-hidden">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center text-green-600 dark:text-green-400 flex-shrink-0">
                  <Icons.File className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">{doc.name}</span>
              </div>
              <button 
                onClick={() => removeDoc(doc.id)}
                className="text-red-400 hover:text-red-600 p-1"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Configuration */}
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-slate-700 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Number of Questions: <span className="text-blue-600 font-bold">{numQuestions}</span>
          </label>
          <input 
            type="range" 
            min="1" 
            max="100" 
            value={numQuestions} 
            onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Time Limit (Minutes)
          </label>
          <div className="relative">
            <input 
              type="number" 
              min="0" 
              value={timeLimit === 0 ? '' : timeLimit}
              onChange={(e) => {
                const val = parseInt(e.target.value);
                setTimeLimit(isNaN(val) ? 0 : Math.max(0, val));
              }}
              placeholder="No limit"
              className="w-full p-3 pr-16 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
            />
             <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 text-sm pointer-events-none font-medium">
              mins
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Leave empty or 0 for unlimited time.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Difficulty Level
          </label>
          <div className="grid grid-cols-3 gap-3">
            {['Easy', 'Medium', 'Hard'].map((level) => (
              <button
                key={level}
                onClick={() => setDifficulty(level as any)}
                className={`p-3 rounded-lg border text-sm font-bold transition-all
                  ${difficulty === level
                    ? level === 'Easy' 
                      ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
                      : level === 'Medium'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800'
                        : 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                `}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        <div>
           <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
             Custom Instructions / Style <span className="text-gray-400 font-normal">(Optional)</span>
           </label>
           <textarea
             value={customInstructions}
             onChange={(e) => setCustomInstructions(e.target.value)}
             placeholder="e.g., 'For vocab, don't ask for definitions, use them in context sentences', 'Focus on dates', 'Make it very hard'..."
             className="w-full p-3 h-24 rounded-lg border border-gray-300 dark:border-slate-600 bg-gray-50 dark:bg-slate-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400 resize-none"
           />
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
             Tell AI exactly how you want the questions framed or what specific aspects to focus on.
           </p>
        </div>

        <div>
          <div className="flex justify-between items-center mb-3">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Question Types</label>
            <button 
              onClick={() => { setAutoDetect(!autoDetect); setSelectedTypes([]); }}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${autoDetect 
                ? 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:border-blue-800' 
                : 'text-gray-500 border-gray-200 dark:border-gray-700'}`}
            >
              {autoDetect ? 'Auto-Detect Active' : 'Manual Selection'}
            </button>
          </div>
          
          <div className={`grid grid-cols-2 md:grid-cols-3 gap-3 ${autoDetect ? 'opacity-50 pointer-events-none' : ''}`}>
            {QUESTION_TYPES.map((type) => (
              <div 
                key={type.id}
                onClick={() => toggleType(type.id)}
                className={`cursor-pointer p-3 rounded-lg border text-sm font-medium flex items-center space-x-2 transition-all
                  ${selectedTypes.includes(type.id) 
                    ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' 
                    : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                `}
              >
                <div className={`w-4 h-4 flex-shrink-0 rounded-full border flex items-center justify-center ${selectedTypes.includes(type.id) ? 'border-blue-500 bg-blue-500' : 'border-gray-400'}`}>
                  {selectedTypes.includes(type.id) && <Icons.Tick className="w-3 h-3 text-white" />}
                </div>
                <span>{type.label}</span>
              </div>
            ))}
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm flex items-center space-x-2">
            <Icons.Alert className="w-4 h-4" />
            <span>{error}</span>
          </div>
        )}

        <button 
          onClick={handleSubmit}
          disabled={isProcessing}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all transform hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isProcessing ? 'Processing files...' : 'Generate Quiz with AI'}
        </button>
      </div>
    </div>
  );
};