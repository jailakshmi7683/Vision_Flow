import React, { useState, useRef } from 'react';
import { Upload, Loader2, AlertCircle, CheckCircle2, ShieldAlert, MapPin, Info, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import { compressImage } from '../lib/imageUtils';

interface DetectionViewProps {
  onCaseCreated: () => void;
}

export default function DetectionView({ onCaseCreated }: DetectionViewProps) {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeImage = async (retryCount = 0) => {
    if (!image) return;
    setAnalyzing(true);
    setError(null);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('Gemini API Key is not configured. Please add it to your environment.');
      }

      // Compress image to reduce payload size and prevent XHR errors
      const compressedImage = await compressImage(image, 1024, 1024, 0.7);
      const base64Data = compressedImage.split(',')[1] || compressedImage;

      const ai = new GoogleGenAI({ apiKey });
      
      const prompt = `Analyze this PCB image for defects. 
      Look for:
      1. Missing Component
      2. Solder Bridge
      3. Misalignment
      
      Return ONLY a JSON object. Do not include any other text or markdown.
      
      Example of valid output:
      {
        "hasDefect": true,
        "defectType": "Solder Bridge",
        "confidence": 0.95,
        "severity": "HIGH",
        "reason": "Unusual conductive connection between adjacent pins on U4.",
        "repairSuggestions": ["Remove excess solder using desoldering tool", "Inspect adjacent pins for unintended connections"],
        "location": { "ymin": 250, "xmin": 400, "ymax": 300, "xmax": 500 },
        "description": "Short circuit between two adjacent pads on U4."
      }

      The JSON object must follow this schema:
      - hasDefect: boolean
      - defectType: "Missing Component" | "Solder Bridge" | "Misalignment" | "None"
      - confidence: number (0-1)
      - severity: "LOW" | "MEDIUM" | "HIGH"
      - reason: string (Explain why the defect was detected based on visual cues)
      - repairSuggestions: string[] (Actionable repair steps for technicians)
      - location: { ymin: integer, xmin: integer, ymax: integer, xmax: integer } (0-1000) or null
      - description: string (max 200 characters)
      
      IMPORTANT: All coordinates must be INTEGERS between 0 and 1000. DO NOT use decimal points for coordinates.
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: prompt },
              { inlineData: { mimeType: "image/jpeg", data: base64Data } }
            ]
          }
        ],
        config: {
          responseMimeType: "application/json",
          maxOutputTokens: 1000,
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              hasDefect: { type: Type.BOOLEAN },
              defectType: { 
                type: Type.STRING,
                description: "The type of defect detected"
              },
              confidence: { type: Type.NUMBER },
              severity: {
                type: Type.STRING,
                description: "Defect severity: LOW, MEDIUM, or HIGH"
              },
              reason: {
                type: Type.STRING,
                description: "Explainable AI reason for detection"
              },
              repairSuggestions: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
                description: "Actionable repair steps"
              },
              location: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.INTEGER, description: "Normalized coordinate 0-1000" },
                  xmin: { type: Type.INTEGER, description: "Normalized coordinate 0-1000" },
                  ymax: { type: Type.INTEGER, description: "Normalized coordinate 0-1000" },
                  xmax: { type: Type.INTEGER, description: "Normalized coordinate 0-1000" },
                },
                nullable: true,
                description: "Normalized coordinates 0-1000. Set to null if no defect."
              },
              description: { 
                type: Type.STRING,
                description: "Short description (max 100 chars)"
              }
            },
            required: ["hasDefect", "defectType", "confidence", "description", "severity", "reason", "repairSuggestions"]
          }
        }
      });

      let text = response.text || '{}';
      console.log('AI Response Length:', text.length);
      
      // 1. Sanitize runaway numbers (e.g. 123.4567890123456789...)
      // This regex looks for numbers with many digits after a decimal point and truncates them
      text = text.replace(/(\d+\.\d{4})\d+/g, '$1'); 
      
      // 2. Sanitize extremely long sequences of digits (runaway integers)
      text = text.replace(/\d{20,}/g, '0');
      
      // 3. Clean up potential markdown or unexpected text
      text = text.trim();
      if (text.includes('{')) {
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          text = text.substring(start, end + 1);
        }
      }
      
      let analysisResult;
      try {
        // Try to parse the cleaned text
        try {
          analysisResult = JSON.parse(text);
        } catch (initialParseError) {
          // If parsing fails, try to close potentially truncated JSON
          console.warn('Initial JSON parse failed, attempting to fix truncated JSON...');
          let fixedText = text;
          const openBraces = (fixedText.match(/{/g) || []).length;
          const closeBraces = (fixedText.match(/}/g) || []).length;
          if (openBraces > closeBraces) {
            fixedText += '}'.repeat(openBraces - closeBraces);
          }
          analysisResult = JSON.parse(fixedText);
        }
        
        // Post-process: Ensure coordinates are integers if they somehow slipped through as floats
        if (analysisResult.location) {
          analysisResult.location.ymin = Math.round(Number(analysisResult.location.ymin) || 0);
          analysisResult.location.xmin = Math.round(Number(analysisResult.location.xmin) || 0);
          analysisResult.location.ymax = Math.round(Number(analysisResult.location.ymax) || 0);
          analysisResult.location.xmax = Math.round(Number(analysisResult.location.xmax) || 0);
        }
      } catch (parseError) {
        console.error('Failed to parse AI response as JSON:', text);
        throw new Error('The AI returned an invalid response format. Please try again.');
      }
      
      let createdCase = null;
      if (analysisResult.hasDefect) {
        const caseRes = await fetch('/api/cases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            defectType: analysisResult.defectType,
            imageUrl: compressedImage, // Save the compressed version
            location: analysisResult.location,
            description: analysisResult.description,
            severity: analysisResult.severity,
            reason: analysisResult.reason,
            repairSuggestions: analysisResult.repairSuggestions
          }),
        });
        createdCase = await caseRes.json();
        onCaseCreated();
      }

      setResult({ result: analysisResult, case: createdCase });
    } catch (err: any) {
      console.error('AI Analysis Error:', err);
      
      // Handle specific API errors
      if (err.message?.includes('API key not valid')) {
        setError('The Gemini API key is invalid or has expired. Please check your configuration.');
        setAnalyzing(false);
        return;
      }

      // Retry logic for transient errors (max 2 retries)
      if (retryCount < 2 && (err.message?.includes('xhr error') || err.message?.includes('500') || err.message?.includes('UNKNOWN'))) {
        console.log(`Retrying analysis (attempt ${retryCount + 1})...`);
        setTimeout(() => analyzeImage(retryCount + 1), 1000);
        return;
      }

      setError(err.message || 'An error occurred during AI analysis.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Defect Detection</h2>
          <p className="text-slate-500">Upload PCB images for real-time AI analysis and automated case creation.</p>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-100"
        >
          <Upload className="w-5 h-5" />
          Upload Image
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Preview Area */}
        <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
          {image ? (
            <div className="relative flex-1 rounded-2xl overflow-hidden bg-slate-100">
              <img src={image} alt="PCB Preview" className="w-full h-full object-contain" />
              
              {/* Bounding Box Overlay */}
              {result?.result?.location && (
                <div 
                  className="absolute border-4 border-red-500 bg-red-500/20 rounded-sm shadow-[0_0_15px_rgba(239,68,68,0.5)]"
                  style={{
                    top: `${result.result.location.ymin / 10}%`,
                    left: `${result.result.location.xmin / 10}%`,
                    width: `${(result.result.location.xmax - result.result.location.xmin) / 10}%`,
                    height: `${(result.result.location.ymax - result.result.location.ymin) / 10}%`,
                  }}
                >
                  <div className="absolute -top-8 left-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-sm whitespace-nowrap uppercase tracking-tighter">
                    {result.result.defectType}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer hover:bg-slate-50 transition-colors group"
            >
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-slate-900">Click to upload PCB image</p>
                <p className="text-sm text-slate-500">Supports JPG, PNG up to 10MB</p>
              </div>
            </div>
          )}

          {image && !result && !analyzing && (
            <button
              onClick={analyzeImage}
              className="mt-4 w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all"
            >
              Start AI Analysis
            </button>
          )}
        </div>

        {/* Results Area */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {analyzing ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center gap-6 shadow-sm min-h-[400px]"
              >
                <div className="relative">
                  <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <ShieldAlert className="w-8 h-8 text-indigo-600 animate-pulse" />
                  </div>
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-bold text-slate-900 mb-2">Scanning PCB...</h3>
                  <p className="text-slate-500">Our AI is analyzing component alignment, solder joints, and board integrity.</p>
                </div>
                <div className="w-full max-w-xs bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-indigo-600"
                    initial={{ width: "0%" }}
                    animate={{ width: "100%" }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </div>
              </motion.div>
            ) : result ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="space-y-6"
              >
                {/* Status Card */}
                <div className={cn(
                  "p-6 rounded-3xl border shadow-sm flex items-start gap-4",
                  result.result.hasDefect 
                    ? "bg-red-50 border-red-100 text-red-900" 
                    : "bg-emerald-50 border-emerald-100 text-emerald-900"
                )}>
                  <div className={cn(
                    "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0",
                    result.result.hasDefect ? "bg-red-100" : "bg-emerald-100"
                  )}>
                    {result.result.hasDefect ? <AlertCircle className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-lg font-bold">
                        {result.result.hasDefect ? "Defect Detected" : "Quality Check Passed"}
                      </h3>
                      {result.result.hasDefect && (
                        <span className={cn(
                          "px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider",
                          result.result.severity === 'HIGH' ? "bg-red-200 text-red-800" :
                          result.result.severity === 'MEDIUM' ? "bg-amber-200 text-amber-800" :
                          "bg-blue-200 text-blue-800"
                        )}>
                          {result.result.severity} Severity
                        </span>
                      )}
                    </div>
                    <p className="text-sm opacity-80 mt-1">
                      {result.result.description}
                    </p>
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Defect Type</p>
                    <p className="text-lg font-bold text-slate-900">{result.result.defectType}</p>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Confidence</p>
                    <p className="text-lg font-bold text-slate-900">{(result.result.confidence * 100).toFixed(1)}%</p>
                  </div>
                </div>

                {/* Explainability & Suggestions */}
                {result.result.hasDefect && (
                  <div className="space-y-4">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <Info className="w-4 h-4 text-indigo-600" />
                        <p className="text-xs font-bold text-slate-900 uppercase tracking-wider">AI Reason (Explainability)</p>
                      </div>
                      <p className="text-sm text-slate-600 leading-relaxed italic">
                        "{result.result.reason}"
                      </p>
                    </div>

                    <div className="bg-indigo-50 p-5 rounded-2xl border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                        <RefreshCw className="w-4 h-4 text-indigo-600" />
                        <p className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Smart Repair Suggestions</p>
                      </div>
                      <ul className="space-y-2">
                        {result.result.repairSuggestions.map((suggestion: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-indigo-800">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                            {suggestion}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {result.case && (
                  <div className="bg-slate-900 text-white p-6 rounded-3xl shadow-xl shadow-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-indigo-400" />
                        <h4 className="font-bold">Workflow Automation</h4>
                      </div>
                      <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-full font-mono">
                        CASE: {result.case.id.slice(0, 8)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-300">
                      A repair case has been automatically generated and assigned to the technician queue.
                    </p>
                    <div className="flex items-center gap-4 text-xs font-medium text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>Station 04</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 p-6 rounded-3xl text-red-700 flex flex-col items-center gap-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="w-6 h-6 shrink-0" />
                  <p className="font-medium">{error}</p>
                </div>
                <button
                  onClick={() => analyzeImage()}
                  className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-red-700 transition-all"
                >
                  <RefreshCw className="w-4 h-4" />
                  Try Again
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-slate-200 p-8 flex flex-col items-center justify-center text-center gap-4 shadow-sm min-h-[400px]">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
                  <ShieldAlert className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Awaiting Input</h3>
                  <p className="text-sm text-slate-500 max-w-xs mx-auto">
                    Upload a PCB image to begin the autonomous quality assurance process.
                  </p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}
