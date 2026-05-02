import React, { useState, useRef } from 'react';

interface CaptchaVerifyProps {
  imageUrl: string;
  onVerify: (answer: string[]) => Promise<void>;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

const CaptchaVerify: React.FC<CaptchaVerifyProps> = ({
  imageUrl,
  onVerify,
  onRefresh,
  disabled = false,
}) => {
  const [selectedChars, setSelectedChars] = useState<string[]>([]);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chars] = useState<string[]>([
    '天', '地', '玄', '黄', '宇', '宙', '洪', '荒',
    '日', '月', '盈', '昃', '辰', '宿', '列', '张',
    '寒', '来', '暑', '往', '秋', '收', '冬', '藏',
  ]);
  const imgRef = useRef<HTMLImageElement>(null);

  // Parse characters from image URL (for demo, we use the chars array)
  // In production, the backend sends the answer separately for verification

  const handleCharClick = (char: string) => {
    if (disabled || isVerifying) return;
    if (selectedChars.length >= 4) return;

    setError(null);
    const newSelected = [...selectedChars, char];
    setSelectedChars(newSelected);

    // Auto-verify when 4 characters are selected
    if (newSelected.length === 4) {
      handleVerify(newSelected);
    }
  };

  const handleVerify = async (answer: string[]) => {
    setIsVerifying(true);
    setError(null);
    try {
      await onVerify(answer);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '验证失败');
      setSelectedChars([]);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRefresh = async () => {
    setSelectedChars([]);
    setError(null);
    await onRefresh();
  };

  const handleClear = () => {
    if (!disabled && !isVerifying) {
      setSelectedChars([]);
      setError(null);
    }
  };

  return (
    <div className="space-y-3">
      {/* Captcha Image Display */}
      <div className="relative bg-gray-50 rounded-lg p-2">
        <img
          ref={imgRef}
          src={imageUrl}
          alt="验证码"
          className="w-full h-20 object-contain"
        />
        {/* Overlay to show selected characters on image */}
        <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2 flex gap-1">
          {[0, 1, 2, 3].map((index) => (
            <div
              key={index}
              className="w-8 h-8 bg-white border border-gray-300 rounded flex items-center justify-center text-lg font-bold text-primary"
            >
              {selectedChars[index] || '?'}
            </div>
          ))}
        </div>
      </div>

      {/* Character Selection Grid */}
      <div className="grid grid-cols-8 gap-1">
        {chars.map((char, index) => {
          const isSelected = selectedChars.includes(char);
          return (
            <button
              key={index}
              type="button"
              onClick={() => handleCharClick(char)}
              disabled={disabled || isVerifying || (isSelected ? false : selectedChars.length >= 4)}
              className={`
                h-8 text-sm font-medium rounded transition-all
                ${isSelected
                  ? 'bg-primary text-white scale-95'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }
                ${disabled || isVerifying ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              {char}
            </button>
          );
        })}
      </div>

      {/* Error Message */}
      {error && (
        <div className="text-red-500 text-sm">{error}</div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleClear}
          disabled={disabled || isVerifying || selectedChars.length === 0}
          className="flex-1 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          清除
        </button>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={disabled || isVerifying}
          className="flex-1 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          换一张
        </button>
      </div>

      {/* Verification Loading */}
      {isVerifying && (
        <div className="text-center text-sm text-gray-500">
          验证中...
        </div>
      )}

      {/* Hint */}
      <p className="text-xs text-gray-500 text-center">
        点击上方字符，按顺序点击{chars.slice(0, 4).join('')}四个字符
      </p>
    </div>
  );
};

export default CaptchaVerify;