"use client";

export default function PasswordStrength({ password }: { password: string }) {
  const getStrength = () => {
    let score = 0;
    if (!password) return { score: 0, label: '', color: 'bg-gray-200', textColor: 'text-gray-400' };
    if (password.length >= 6) score++;
    if (password.length >= 10) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return { score, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-500' };
    if (score === 3 || score === 4) return { score, label: 'Medium', color: 'bg-yellow-500', textColor: 'text-yellow-500' };
    return { score, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-500' };
  };

  const { score, label, color, textColor } = getStrength();

  if (!password) return null;

  return (
    <div className="mt-2">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-gray-500">Password Strength</span>
        <span className={"text-xs font-bold " + textColor}>{label}</span>
      </div>
      <div className="flex space-x-1 h-1.5">
        {[1, 2, 3, 4, 5].map((step) => (
          <div key={step} className={"flex-1 rounded-full " + (step <= score ? color : 'bg-gray-200')} />
        ))}
      </div>
    </div>
  );
}
