import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

// Helper to validate API key existence silently
const isKeyAvailable = () => !!process.env.API_KEY;

export interface ExtractedParcelData {
  trackingNumber?: string;
  customerNameHint?: string;
  weight?: number;
  description?: string;
  suggestedAction?: string;
}

/**
 * Parses a waybill image or messy text to extract parcel details.
 */
export const analyzeWaybill = async (
  imageBase64: string | null,
  textContext: string = ''
): Promise<ExtractedParcelData> => {
  if (!isKeyAvailable()) {
    console.warn("Gemini API key missing. Returning mock data.");
    return { description: "模拟提取数据 (无 API Key)", weight: 1.5 };
  }

  try {
    const model = 'gemini-2.5-flash';
    const parts: any[] = [];

    if (textContext) {
      parts.push({ text: `用户提供的上下文: ${textContext}` });
    }

    if (imageBase64) {
      // Clean base64 string if needed
      const cleanBase64 = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg',
          data: cleanBase64
        }
      });
    }

    parts.push({
      text: `请从运单图片或文本中提取以下详细信息 (请尽量准确):
      - trackingNumber: 主条形码或追踪 ID.
      - customerNameHint: 任何可见的收件人姓名.
      - weight: 重量 (KG), 仅返回数字.
      - description: 物品内容的简短描述 (使用中文).
      - suggestedAction: 如果标签看起来损坏或不清楚，建议 "FLAG_ISSUE"，否则建议 "PROCEED".
      `
    });

    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            trackingNumber: { type: Type.STRING },
            customerNameHint: { type: Type.STRING },
            weight: { type: Type.NUMBER },
            description: { type: Type.STRING },
            suggestedAction: { type: Type.STRING },
          }
        }
      }
    });

    if (response.text) {
      return JSON.parse(response.text) as ExtractedParcelData;
    }
    throw new Error("No response text from Gemini");

  } catch (error) {
    console.error("Gemini analysis failed:", error);
    // Fallback or rethrow
    return { description: "分析失败" };
  }
};

/**
 * Generates a smart daily summary based on raw stats.
 */
export const generateSmartReport = async (stats: any): Promise<string> => {
  if (!isKeyAvailable()) return "缺少 Gemini API Key，无法生成智能报告。";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `你是一位物流经理助理。请根据这些每日统计数据，用中文写两句总结，强调绩效和任何警报（如延误的包裹）。
      统计数据: ${JSON.stringify(stats)}`
    });
    return response.text || "未生成报告。";
  } catch (e) {
    console.error(e);
    return "生成报告时出错。";
  }
};

/**
 * Suggests the best bag for a parcel based on existing open bags and parcel destination/desc.
 */
export const suggestBaggingStrategy = async (parcelDesc: string, openBags: any[]): Promise<string> => {
  if (!isKeyAvailable()) return "";

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `我有一个包裹，描述为 "${parcelDesc}".
      这里有一些打开的集包袋: ${JSON.stringify(openBags.map(b => ({ id: b.id, dest: b.destination, items: b.parcelCount })))}.
      这个包裹应该放入哪个袋子 ID？只返回袋子 ID 字符串，如果不合适则返回 "NEW"。`
    });
    return response.text?.trim() || "";
  } catch (e) {
    return "";
  }
};