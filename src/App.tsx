/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useFontStore } from './store/fontStore';
import { Header } from './components/Header';
import { HeroSection } from './components/HeroSection';
import { PlaygroundModeSelector } from './components/PlaygroundModeSelector';
import { CharacterMatrix } from './components/CharacterMatrix';
import { DrawingStudioModal } from './components/DrawingStudioModal';
import { TestDriveModal } from './components/TestDriveModal';
import { Footer } from './components/Footer';
import { OfflineIndicator } from './components/OfflineIndicator';

export default function App() {
  const store = useFontStore();

  return (
    <div className="min-h-screen bg-[#fafafc] text-gray-900 selection:bg-purple-100 selection:text-purple-900">
      {/* Top Sticky Header */}
      <Header store={store} />

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Hero Banner with Big Headline & Progress Card */}
        <HeroSection store={store} />

        {/* Playground Mode Selector (Easy / Medium / Typographer) */}
        <PlaygroundModeSelector store={store} />

        {/* Character Matrix Grid (Vowels, Consonants, Signs, Conjuncts, Digits) */}
        <CharacterMatrix store={store} />

        {/* Bottom Banner & Footer */}
        <Footer />
      </main>

      {/* Drawing Studio Modal (Pointer Event Canvas) */}
      <DrawingStudioModal store={store} />

      {/* Interactive Live Typing Sandbox */}
      <TestDriveModal store={store} />

      {/* Offline Status Indicator */}
      <OfflineIndicator />
    </div>
  );
}
