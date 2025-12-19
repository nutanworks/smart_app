import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  return (
    <div className={`mb-5 group ${className}`}>
      <label className="block text-sm font-semibold text-gray-700 mb-2 transition-colors group-focus-within:text-indigo-600">
        {label}
      </label>
      <input
        className={`w-full px-4 py-3 bg-white text-gray-900 placeholder-gray-400 border rounded-xl shadow-sm 
        focus:outline-none focus:ring-4 focus:ring-opacity-20 transition-all duration-300 ease-out
        hover:border-indigo-300 focus:-translate-y-1 focus:shadow-lg
        ${error 
          ? 'border-red-500 focus:border-red-500 focus:ring-red-500' 
          : 'border-gray-200 focus:border-indigo-500 focus:ring-indigo-500'
        }`}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-600 animate-pulse">{error}</p>}
    </div>
  );
};