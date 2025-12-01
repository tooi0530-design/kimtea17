import { GoogleGenAI, Type } from "@google/genai";
import { WeeklyData, DayKey } from "../types";

// Helper to generate a unique ID
const generateId = () => Math.random().toString(36).substr(2, 9);

export const generateSmartPlan = async (goal: string, weekStartDate: string): Promise<Partial<WeeklyData>> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing. Please configure process.env.API_KEY.");
  }

  const ai = new GoogleGenAI({ apiKey });

  const systemInstruction = `
    You are an expert weekly planning assistant. 
    Your goal is to take a user's high-level goal or schedule requirements and convert them into a structured weekly plan.
    The plan should be realistic and actionable.
    
    The user is planning for the week starting on ${weekStartDate}.
    
    Return a JSON object that maps each day (mon-sun) to a list of short task strings.
    Also provide a general "To Do List" for the week and a "Memo" for any motivational quotes or notes.
    
    Ensure the tasks are concise (under 5 words preferably) to fit in a paper planner layout.
    Max 6 tasks per day.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Create a weekly plan for this goal: "${goal}"`,
    config: {
      systemInstruction: systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          mon: { type: Type.ARRAY, items: { type: Type.STRING } },
          tue: { type: Type.ARRAY, items: { type: Type.STRING } },
          wed: { type: Type.ARRAY, items: { type: Type.STRING } },
          thu: { type: Type.ARRAY, items: { type: Type.STRING } },
          fri: { type: Type.ARRAY, items: { type: Type.STRING } },
          sat: { type: Type.ARRAY, items: { type: Type.STRING } },
          sun: { type: Type.ARRAY, items: { type: Type.STRING } },
          todoList: { type: Type.ARRAY, items: { type: Type.STRING } },
          memo: { type: Type.STRING }
        },
        required: ["mon", "tue", "wed", "thu", "fri", "sat", "sun", "todoList", "memo"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");

  try {
    const json = JSON.parse(text);
    
    // Transform simple strings into Task objects
    const transformTasks = (tasks: string[] = []) => 
      tasks.map(t => ({ id: generateId(), text: t, done: false }));

    const mappedData: Partial<WeeklyData> = {
      days: {
        mon: { tasks: transformTasks(json.mon), note: '' },
        tue: { tasks: transformTasks(json.tue), note: '' },
        wed: { tasks: transformTasks(json.wed), note: '' },
        thu: { tasks: transformTasks(json.thu), note: '' },
        fri: { tasks: transformTasks(json.fri), note: '' },
        sat: { tasks: transformTasks(json.sat), note: '' },
        sun: { tasks: transformTasks(json.sun), note: '' },
      },
      todoList: transformTasks(json.todoList),
      memo: json.memo || '',
    };

    return mappedData;
  } catch (e) {
    console.error("Failed to parse Gemini response", e);
    throw new Error("Failed to generate plan.");
  }
};
