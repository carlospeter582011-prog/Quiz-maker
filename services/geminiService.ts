import { GoogleGenAI, Type, Schema } from "@google/genai";
import { Question, QuestionType, UserAnswer, GradedQuestion, QuizResult, UploadedFile } from "../types";

// Schema for generating the quiz questions
const questionSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          type: { type: Type.STRING, enum: Object.values(QuestionType) },
          text: { type: Type.STRING, description: "The question stem or instruction." },
          options: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Only for multiple_choice." },
          correctAnswer: { type: Type.STRING, description: "The distinct correct answer for simple types." },
          matchingPairs: {
             type: Type.ARRAY,
             items: {
               type: Type.OBJECT,
               properties: {
                 left: { type: Type.STRING },
                 right: { type: Type.STRING }
               }
             },
             description: "For MATCHING type only. Provide pairs of items that go together."
          },
          sequencingItems: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "For SEQUENCING type only. Provide the list of items in the CORRECT order."
          }
        },
        required: ["id", "type", "text"],
      },
    },
  },
  required: ["questions"],
};

// Schema for grading the quiz
const gradingSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    gradedQuestions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.INTEGER },
          isCorrect: { type: Type.BOOLEAN },
          score: { type: Type.NUMBER, description: "1 for correct, 0 for incorrect, 0.5 for partial." },
          explanation: { type: Type.STRING, description: "Why the answer is wrong or right." },
          aiCorrection: { type: Type.STRING, description: "The ideal answer." },
        },
        required: ["id", "isCorrect", "score", "explanation", "aiCorrection"],
      },
    },
    overallFeedback: { type: Type.STRING, description: "General feedback on the student's performance." },
  },
  required: ["gradedQuestions", "overallFeedback"],
};

// Helper to shuffle array (Fisher-Yates)
const shuffleArray = <T>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export const generateQuiz = async (
  documents: UploadedFile[],
  numQuestions: number,
  types: QuestionType[],
  autoDetect: boolean,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  customInstructions?: string
): Promise<Question[]> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  let prompt = `Create a quiz with exactly ${numQuestions} questions based on the attached lesson materials.`;
  
  // Difficulty instruction
  prompt += `\nTarget Difficulty Level: ${difficulty}.`;
  if (difficulty === 'Easy') {
    prompt += " Focus on basic recall, definitions, and simple concepts.";
  } else if (difficulty === 'Medium') {
    prompt += " Focus on understanding, application, and connecting concepts.";
  } else if (difficulty === 'Hard') {
    prompt += " Focus on deep analysis, complex problem solving, and nuances.";
  }

  if (customInstructions && customInstructions.trim()) {
    prompt += `\n\nCRITICAL INSTRUCTIONS: The user has provided specific requirements for the question style, format, or content focus: "${customInstructions}".
    You MUST shape the questions exactly according to these instructions. For example, if asked to use vocabulary in context, do not ask for definitions. If asked for a specific topic, ignore unrelated content.`;
  }

  if (autoDetect) {
    prompt += ` Choose a mix of question types (Multiple Choice, True/False, Fill in Blank, Short Answer, Matching, Sequencing) that best suits the content.`;
  } else {
    prompt += ` STRICTLY use only these question types: ${types.join(', ')}.`;
  }

  prompt += `
  Instructions for specific types:
  - MATCHING: Provide 'matchingPairs' with left and right items (e.g., Term and Definition).
  - SEQUENCING: Provide 'sequencingItems' in the CORRECT chronological or logical order.
  - SHORT_ANSWER: Can include 'Correct the underline' or 'Rewrite' tasks.
  
  Output JSON.`;

  // Prepare contents with all files
  const parts = documents.map(doc => ({
    inlineData: {
      mimeType: doc.mimeType,
      data: doc.base64,
    }
  }));
  
  parts.push({ text: prompt } as any);

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: {
        parts: parts,
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: questionSchema,
        temperature: 0.4,
      },
    });

    const data = JSON.parse(response.text || "{}");
    if (!data.questions) throw new Error("Invalid response structure");

    // Process questions: Shuffle options for MCQ
    const questions: Question[] = data.questions.map((q: any) => {
      if (q.type === QuestionType.MULTIPLE_CHOICE && q.options && Array.isArray(q.options)) {
        return {
          ...q,
          options: shuffleArray(q.options)
        };
      }
      return q;
    });

    return questions;
  } catch (error) {
    console.error("Gemini Generation Error:", error);
    throw error;
  }
};

export const gradeQuiz = async (
  originalQuestions: Question[],
  userAnswers: UserAnswer[]
): Promise<QuizResult> => {
  if (!process.env.API_KEY) throw new Error("API Key missing");

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  // Construct a prompt context that includes the questions and the user's answers
  const gradingContext = {
    questions: originalQuestions.map(q => ({
      id: q.id,
      text: q.text,
      correctAnswer: q.correctAnswer,
      matchingPairs: q.matchingPairs,
      sequencingItems: q.sequencingItems,
      type: q.type
    })),
    userAnswers: userAnswers
  };

  const prompt = `
    You are a strict but helpful teacher. Grade this student's quiz submission.
    Compare 'userAnswers' against the 'questions'.
    
    Grading Logic:
    - MATCHING: Check if user pairs match the 'matchingPairs'.
    - SEQUENCING: Check if user order matches 'sequencingItems'.
    - SHORT_ANSWER: Use your knowledge to judge meaning.
    
    Provide an explanation for EVERY question.
    Data: ${JSON.stringify(gradingContext)}
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: gradingSchema,
        temperature: 0.2, // Low temperature for consistent grading
      },
    });

    const data = JSON.parse(response.text || "{}");
    
    // Merge the AI grading with the original question data to form the full result
    const mergedGradedQuestions: GradedQuestion[] = data.gradedQuestions.map((gq: any) => {
      const original = originalQuestions.find(q => q.id === gq.id);
      const userAnswer = userAnswers.find(a => a.questionId === gq.id)?.answer || "";
      
      if (!original) throw new Error(`Question ID ${gq.id} mismatch`);

      return {
        ...original,
        userAnswer,
        isCorrect: gq.isCorrect,
        score: gq.score,
        explanation: gq.explanation,
        aiCorrection: gq.aiCorrection
      };
    });

    const totalScore = mergedGradedQuestions.reduce((acc, curr) => acc + curr.score, 0);

    return {
      totalScore,
      maxScore: originalQuestions.length,
      gradedQuestions: mergedGradedQuestions,
      overallFeedback: data.overallFeedback || "Quiz completed."
    };

  } catch (error) {
    console.error("Gemini Grading Error:", error);
    throw error;
  }
};

export const explainQuestion = async (
  questionText: string,
  userAnswer: string,
  correctAnswer: string,
  query: string
): Promise<string> => {
   if (!process.env.API_KEY) throw new Error("API Key missing");
   const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

   const prompt = `
   Context:
   Question: "${questionText}"
   Student Answer: "${userAnswer}"
   Correct Answer: "${correctAnswer}"

   The student asks: "${query}"

   Provide a clear, helpful explanation. Be concise but thorough.
   `;

   const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
   });

   return response.text || "I couldn't generate an explanation at this time.";
}