import { useState } from 'react';

interface Props {
  questionText: string;
  questionKey: string;
  onAnswer: (key: string, answer: string) => void;
}

export default function InteractiveOverlay({ questionText, questionKey, onAnswer }: Props) {
  const [answered, setAnswered] = useState<string | null>(null);

  const handleAnswer = (answer: string) => {
    setAnswered(answer);
    onAnswer(questionKey, answer);
  };

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-30 flex flex-col items-center justify-end pb-12 pt-32"
      style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85), transparent)' }}
    >
      <p className="mb-6 text-center text-xl font-semibold text-white px-4">{questionText}</p>
      <div className="flex gap-4">
        {['Sí', 'No'].map(option => (
          <button
            key={option}
            onClick={() => handleAnswer(option)}
            disabled={!!answered}
            className="rounded-[50px] border px-8 py-3 text-lg font-medium transition-all duration-200"
            style={{
              background: answered === option ? '#86efac' : 'rgba(255,255,255,0.2)',
              borderColor: answered === option ? '#86efac' : 'rgba(255,255,255,0.4)',
              color: answered === option ? '#000' : '#fff',
            }}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
