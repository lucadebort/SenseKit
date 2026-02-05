import React from 'react';

export const ConceptExplainer: React.FC = () => {
  return (
    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-slate-700">
      <h3 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        How to Map (Read Carefully)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <strong className="text-blue-700 block mb-1">1. Distance from Center = Power</strong>
          <p className="leading-relaxed text-slate-600">
            <strong>Inner Circle:</strong> Critical decision makers.<br/>
            <strong>Outer Circle:</strong> Peripheral influence.
          </p>
        </div>
        <div>
          <strong className="text-purple-700 block mb-1">2. Angle = Alignment (Important!)</strong>
          <p className="leading-relaxed text-slate-600">
            How to show a relationship between a Central and a Peripheral actor?<br/>
            <span className="block mt-1 bg-white p-1 rounded border border-yellow-100">
            👉 Place them on the <strong>same line (sector)</strong> to show they are allied.<br/>
            👉 Place them on <strong>opposite sides</strong> to show conflict/disconnection.
            </span>
          </p>
        </div>
      </div>
    </div>
  );
};