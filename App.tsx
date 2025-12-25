
import React, { useState, useCallback, useRef } from 'react';
import { Upload, Scissors, Sparkles, Download, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { AppStep, ImageFile } from './types';
import { restoreImage } from './services/geminiService';
import { fileToBase64, getCroppedImg } from './utils/imageHelpers';

// Sub-components
const StepIndicator: React.FC<{ currentStep: AppStep }> = ({ currentStep }) => {
  const steps: { key: AppStep; label: string; icon: any }[] = [
    { key: 'upload', label: '上传图片', icon: Upload },
    { key: 'crop', label: '裁切范围', icon: Scissors },
    { key: 'restoring', label: 'AI 处理中', icon: Sparkles },
    { key: 'result', label: '还原成功', icon: CheckCircle2 },
  ];

  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((s, idx) => {
        const isActive = s.key === currentStep;
        const isPast = steps.findIndex(st => st.key === currentStep) > idx;
        const Icon = s.icon;
        
        return (
          <React.Fragment key={s.key}>
            <div className={`flex flex-col items-center space-y-2`}>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' : 
                isPast ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                <Icon size={20} />
              </div>
              <span className={`text-xs font-medium ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>{s.label}</span>
            </div>
            {idx < steps.length - 1 && (
              <div className={`w-12 h-px ${isPast ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>('upload');
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [restoredImage, setRestoredImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Refs for cropping
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const base64 = await fileToBase64(file);
        setOriginalImage(base64);
        setStep('crop');
        setError(null);
      } catch (err) {
        setError('读取图片失败，请重试');
      }
    }
  };

  const startCrop = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setIsDragging(true);
    setStartPos({ x: clientX - rect.left, y: clientY - rect.top });
    setCrop({ x: clientX - rect.left, y: clientY - rect.top, width: 0, height: 0 });
  };

  const onDrag = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    
    const currentX = clientX - rect.left;
    const currentY = clientY - rect.top;

    setCrop({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width: Math.abs(currentX - startPos.x),
      height: Math.abs(currentY - startPos.y),
    });
  };

  const endCrop = () => {
    setIsDragging(false);
  };

  const handleRestore = async () => {
    if (!imgRef.current) return;

    setIsProcessing(true);
    setStep('restoring');
    setError(null);

    try {
      // If width is 0, use full image
      const sourceImage = (crop.width > 10 && crop.height > 10) 
        ? await getCroppedImg(imgRef.current, crop, 'crop.png')
        : originalImage!;

      setCroppedImage(sourceImage);
      
      const result = await restoreImage(sourceImage, 'image/png');
      setRestoredImage(result);
      setStep('result');
    } catch (err) {
      setError(err instanceof Error ? err.message : '还原试卷失败，请重试');
      setStep('crop');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetApp = () => {
    setStep('upload');
    setOriginalImage(null);
    setCroppedImage(null);
    setRestoredImage(null);
    setError(null);
    setCrop({ x: 0, y: 0, width: 0, height: 0 });
  };

  return (
    <div className="min-h-screen flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="w-full text-center mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">ExamRestorer AI</h1>
        <p className="text-gray-500 max-w-md mx-auto">专业的试卷还原工具：自动去除手写笔迹，高对比度增强，让试卷焕然一新。</p>
      </div>

      <StepIndicator currentStep={step} />

      {/* Main Container */}
      <div className="w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100 flex flex-col">
        
        {/* Step: Upload */}
        {step === 'upload' && (
          <div className="p-12 flex flex-col items-center justify-center min-h-[400px]">
            <label className="group relative w-full max-w-lg cursor-pointer">
              <div className="border-2 border-dashed border-gray-300 group-hover:border-blue-500 rounded-3xl p-12 transition-all duration-300 flex flex-col items-center justify-center bg-gray-50 group-hover:bg-blue-50">
                <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                  <Upload size={40} />
                </div>
                <h3 className="text-xl font-semibold text-gray-800 mb-2">点击或拖拽上传试卷</h3>
                <p className="text-gray-500 text-sm">支持 JPG, PNG, WEBP (建议拍照清晰)</p>
                <input type="file" className="hidden" accept="image/*" onChange={handleFileUpload} />
              </div>
            </label>
            
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full">
              {[
                { title: '笔迹清除', desc: '精准识别蓝/黑/红手写痕迹', color: 'blue' },
                { title: '对比增强', desc: '背景变白，文字加黑更清晰', color: 'indigo' },
                { title: '一键还原', desc: '生成完美空白试卷 PDF/图', color: 'purple' },
              ].map((feature, i) => (
                <div key={i} className="flex items-start space-x-3 p-4">
                  <div className={`mt-1 w-2 h-2 rounded-full bg-${feature.color}-500`} />
                  <div>
                    <h4 className="font-semibold text-gray-800 text-sm">{feature.title}</h4>
                    <p className="text-gray-500 text-xs">{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step: Crop */}
        {step === 'crop' && originalImage && (
          <div className="p-6 flex flex-col items-center">
            <div className="flex justify-between w-full mb-4 px-2">
              <button onClick={resetApp} className="flex items-center text-gray-500 hover:text-gray-700 font-medium">
                <ArrowLeft size={18} className="mr-1" /> 重新上传
              </button>
              <div className="text-sm text-gray-400 font-medium italic">
                {crop.width > 0 ? '拖动选择需要还原的区域' : '如需全页还原，请直接点击下方按钮'}
              </div>
            </div>

            <div 
              className="relative border border-gray-200 rounded-lg overflow-hidden cursor-crosshair select-none bg-gray-100 max-h-[60vh]"
              onMouseDown={startCrop}
              onMouseMove={onDrag}
              onMouseUp={endCrop}
              onMouseLeave={endCrop}
              onTouchStart={startCrop}
              onTouchMove={onDrag}
              onTouchEnd={endCrop}
            >
              <img 
                ref={imgRef}
                src={originalImage} 
                className="max-w-full block" 
                alt="Original" 
                draggable={false}
              />
              {crop.width > 0 && (
                <div 
                  className="absolute border-2 border-blue-500 bg-blue-500/20 shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.width,
                    height: crop.height,
                  }}
                />
              )}
            </div>

            <div className="mt-6 flex space-x-4 w-full">
              <button 
                onClick={handleRestore}
                disabled={isProcessing}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-center transition-all active:scale-95 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="animate-spin mr-2" />
                    正在召唤 AI 专家...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2" />
                    {crop.width > 10 ? '还原选中区域' : '全页直接还原'}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step: Restoring (Loading State) */}
        {step === 'restoring' && (
          <div className="p-20 flex flex-col items-center justify-center min-h-[400px]">
            <div className="relative w-24 h-24 mb-8">
              <div className="absolute inset-0 border-4 border-blue-100 rounded-full" />
              <div className="absolute inset-0 border-4 border-blue-600 rounded-full border-t-transparent animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center text-blue-600">
                <Sparkles size={32} />
              </div>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">正在清除笔迹...</h3>
            <p className="text-gray-500 text-center max-w-xs">
              AI 正在识别并剥离手写层，同时进行纸张亮白和文字对比度增强，请稍候。
            </p>
            <div className="mt-10 w-full max-w-xs bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-600 h-full animate-[loading_2s_ease-in-out_infinite]" style={{ width: '40%' }} />
            </div>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && restoredImage && (
          <div className="p-6 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-800 flex items-center">
                <CheckCircle2 className="text-green-500 mr-2" /> 试卷已完美还原
              </h3>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setStep('crop')}
                  className="px-4 py-2 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center"
                >
                  <RefreshCw size={16} className="mr-2" /> 重新处理
                </button>
                <a 
                  href={restoredImage} 
                  download="restored-exam.png"
                  className="px-6 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 font-bold flex items-center"
                >
                  <Download size={18} className="mr-2" /> 下载结果
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">处理前</span>
                <div className="rounded-xl overflow-hidden shadow-sm border border-gray-200 bg-white">
                  <img src={croppedImage || originalImage!} className="w-full h-auto block" alt="Before" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">处理后 (AI 还原)</span>
                <div className="rounded-xl overflow-hidden shadow-md border border-blue-100 bg-white">
                  <img src={restoredImage} className="w-full h-auto block" alt="After" />
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-center">
              <button 
                onClick={resetApp}
                className="text-blue-600 font-bold hover:underline"
              >
                继续处理下一张试卷 →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Error Message */}
      {error && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-full max-w-md animate-bounce">
          <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl shadow-xl flex items-center">
            <AlertCircle size={20} className="mr-2" />
            <span className="font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto py-8 text-gray-400 text-sm text-center">
        <p>© 2024 ExamRestorer AI. Powered by Gemini Flash Image 2.5</p>
        <p className="mt-1">隐私说明：所有图片处理均由 AI 实时完成，不会永久存储您的试卷数据。</p>
      </footer>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
};

export default App;
