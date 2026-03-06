import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
  return (
    <div className="layout-page min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 transition-colors duration-300">
      <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {(title || description) && (
          <div className="mb-6 sm:mb-8 text-center">
            {title && (
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2 sm:mb-3">
                {title}
              </h1>
            )}
            {description && (
              <p className="text-sm sm:text-base lg:text-lg text-gray-600 max-w-2xl mx-auto">
                {description}
              </p>
            )}
          </div>
        )}
        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 transition-colors duration-300">
          {children}
        </div>
      </div>
    </div>
  );
}
